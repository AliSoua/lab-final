# app/services/LabInstance/tasks/terminate_chain.py
"""
Terminate task chain — 3 idempotent tasks.
"""

import uuid
import os
import socket
import logging
from datetime import datetime, timezone
from typing import Dict, Any
from app.core.logging import log_task
from app.utils.db_session import background_session
from app.utils.expiry_queue import remove_instance_expiry
from app.models.LabDefinition.LabInstance import LabInstance
from app.models.LabInstance.enums import InstanceStatus, TerminationReason, EventSeverity
from app.config.connection.vcenter_client import VCenterClient
from app.services.LabDefinition.task_audit import (
    start_task, finish_task, mark_running, record_event,
)
from app.services.LabInstance.shared import load_instance_locked, check_termination_race
from app.services.LabInstance.utils import _call_with_timeout, _find_vcenter_credentials

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
#  TASK 1: VALIDATE TERMINATE
# ═══════════════════════════════════════════════════════════════════════════════

def run_validate_terminate(
    instance_id: str,
    trainee_id: str,
    task_id: str,
    termination_reason: str = "user_requested",
) -> Dict[str, Any]:
    """
    Validates termination request, marks instance as 'terminating'.
    """
    task_uuid = uuid.UUID(task_id)
    instance_uuid = uuid.UUID(instance_id)
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)
        
        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed"}

        if instance.status == InstanceStatus.TERMINATED.value:
            task_logger.info("Already terminated")
            finish_task(task_uuid, "completed", "Already terminated", db=db)
            return {"status": "success"}

        instance.status = InstanceStatus.TERMINATING.value
        instance.termination_reason = termination_reason
        db.commit()

        record_event(
            task_uuid, instance_uuid, "terminate_validated", "Instance marked terminating",
            event_code="TERMINATE_VALIDATED", db=db,
        )
        finish_task(task_uuid, "completed", db=db)

    # Short-circuit: no VM to destroy
    if not instance.vm_uuid:
        return _enqueue_next(instance_uuid, trainee_id, task_id, "cleanup", skip_destroy=True)

    return _enqueue_next(instance_uuid, trainee_id, task_id, "destroy_vm")


# ═══════════════════════════════════════════════════════════════════════════════
#  TASK 2: DESTROY VM
# ═══════════════════════════════════════════════════════════════════════════════

def run_destroy_vm(
    instance_id: str,
    trainee_id: str,
    task_id: str,
) -> Dict[str, Any]:
    """
    Destroys the VM on vCenter. Handles already-destroyed VMs gracefully.
    """
    task_uuid = uuid.UUID(task_id)
    instance_uuid = uuid.UUID(instance_id)
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)
        
        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed"}

        if instance.status == InstanceStatus.TERMINATED.value:
            finish_task(task_uuid, "completed", "Already terminated", db=db)
            return {"status": "success"}

        vm_uuid = instance.vm_uuid
        vcenter_host = instance.vcenter_host
        db.commit()

    if not vm_uuid:
        task_logger.info("No vm_uuid, skipping destroy")
        finish_task(task_uuid, "completed", db=db)
        return _enqueue_next(instance_uuid, trainee_id, task_id, "cleanup")

    creds = _find_vcenter_credentials(vcenter_host)
    if not creds:
        task_logger.error("No vCenter credentials for %s", vcenter_host)
        # Don't fail — proceed to cleanup, let admin handle orphaned VM
        finish_task(task_uuid, "completed", f"No vCenter creds for {vcenter_host}", db=db)
        return _enqueue_next(instance_uuid, trainee_id, task_id, "cleanup")

    client = VCenterClient(host=creds["host"], username=creds["username"], password=creds["password"])
    if not client.connect():
        task_logger.error("Cannot connect to vCenter %s", vcenter_host)
        finish_task(task_uuid, "completed", f"Cannot connect to {vcenter_host}", db=db)
        return _enqueue_next(instance_uuid, trainee_id, task_id, "cleanup")

    vm_destroyed = False

    try:
        vm = client.find_vm_by_uuid(vm_uuid)
        if vm:
            if str(vm.runtime.powerState) == "poweredOn":
                try:
                    task = vm.PowerOffVM_Task()
                    _call_with_timeout(client._wait_for_task, 120, task)
                    task_logger.info("VM powered off")
                except Exception as e:
                    task_logger.warning("Power off failed (non-fatal): %s", e)

            task = vm.Destroy_Task()
            _call_with_timeout(client._wait_for_task, 180, task)
            vm_destroyed = True
            task_logger.info("VM destroyed")
        else:
            vm_destroyed = True
            task_logger.warning("VM not found, assuming already destroyed")
    except Exception as e:
        task_logger.error("Destroy failed: %s", e)
        # Still proceed to cleanup — don't leave instance in limbo
    finally:
        client.disconnect()

    finish_task(task_uuid, "completed", db=db)
    return _enqueue_next(instance_uuid, trainee_id, task_id, "cleanup", vm_destroyed=vm_destroyed)


# ═══════════════════════════════════════════════════════════════════════════════
#  TASK 3: CLEANUP
# ═══════════════════════════════════════════════════════════════════════════════

def run_cleanup(
    instance_id: str,
    trainee_id: str,
    task_id: str,
    vm_destroyed: bool = False,
    skip_destroy: bool = False,
) -> Dict[str, Any]:
    """
    Final cleanup: mark terminated, clear Guacamole, update session_state,
    remove Redis expiry.
    """
    task_uuid = uuid.UUID(task_id)
    instance_uuid = uuid.UUID(instance_id)
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)
        
        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed"}

        if instance.status == InstanceStatus.TERMINATED.value:
            finish_task(task_uuid, "completed", "Already terminated", db=db)
            return {"status": "success"}

        instance.status = InstanceStatus.TERMINATED.value
        instance.stopped_at = datetime.now(timezone.utc)
        instance.power_state = "powered_off"
        
        # Mark session abandoned
        if instance.session_state:
            session_state = dict(instance.session_state)
            session_state["status"] = "abandoned"
            instance.session_state = session_state

        db.commit()

        # Remove Redis expiry
        try:
            remove_instance_expiry(instance_uuid)
        except Exception:
            pass

        record_event(
            task_uuid, instance_uuid, "instance_terminated", "Instance terminated",
            event_code="INSTANCE_TERMINATED", db=db,
        )
        finish_task(task_uuid, "completed", db=db)

    task_logger.info("Terminate chain completed")
    return {
        "status": "success",
        "instance_id": instance_id,
        "vm_destroyed": vm_destroyed or skip_destroy,
    }


def _enqueue_next(instance_uuid, trainee_id, current_task_id, next_stage, **kwargs):
    from app.tasks.lab_instance_tasks import destroy_vm_task, cleanup_task

    task_map = {
        "destroy_vm": destroy_vm_task,
        "cleanup": cleanup_task,
    }

    next_task_fn = task_map.get(next_stage)
    if not next_task_fn:
        raise ValueError(f"Unknown next stage: {next_stage}")

    next_task_id = start_task(
        instance_uuid,
        task_type=f"terminate.{next_stage}",
        stage=next_stage,
        metadata={"previous_task_id": current_task_id, **kwargs},
    )

    args = [str(instance_uuid), trainee_id, str(next_task_id)]
    if next_stage == "cleanup":
        args.append(kwargs.get("vm_destroyed", False))
        args.append(kwargs.get("skip_destroy", False))

    next_task_fn.apply_async(args=args, task_id=str(next_task_id), queue="lab.cleanup")
    return {"status": "enqueued", "next_stage": next_stage, "next_task_id": str(next_task_id)}
# backend/app/services/LabInstance/TerminateInstance.py
"""
Lab Instance Terminate Service
Handles enqueueing terminate requests and the Celery worker destroy body.
"""

import uuid
import os
import socket
import logging
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session

from app.core.logging import log_task
from app.utils.db_session import background_session
from app.models.LabDefinition.LabInstance import LabInstance
from app.config.connection.vcenter_client import VCenterClient
from app.services.LabDefinition.task_audit import (
    start_task,
    finish_task,
    mark_running,
    record_event,
)
from app.services.LabInstance.utils import (
    _call_with_timeout,
    _find_vcenter_credentials,
    _delete_guacamole_connections,
    _mark_session_abandoned,
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
#  ENQUEUE TERMINATE (API container)
# ═══════════════════════════════════════════════════════════════════════════════

def enqueue_terminate(
    db: Session,
    instance_id: uuid.UUID,
    trainee_id: uuid.UUID,
) -> LabInstance:
    """
    Synchronous enqueue path.
    Idempotent: accepts 'failed' rows; no-op if already terminating/terminated.
    Deletes Guacamole connections immediately, then hands the vCenter destroy
    to a Celery worker.
    """
    from app.tasks.lab_instance_tasks import terminate_instance_task

    logger.info(
        "Enqueueing terminate | instance_id=%s trainee_id=%s",
        instance_id,
        trainee_id,
    )

    instance = (
        db.query(LabInstance)
        .filter(
            LabInstance.id == instance_id,
            LabInstance.trainee_id == trainee_id,
        )
        .with_for_update()
        .first()
    )
    if not instance:
        logger.error("Instance not found | instance_id=%s", instance_id)
        raise ValueError("Instance not found")

    if instance.status in ("terminating", "terminated"):
        logger.info(
            "Instance already terminal | instance_id=%s status=%s",
            instance_id,
            instance.status,
        )
        return instance

    if instance.status not in ("provisioning", "running", "stopped", "failed"):
        raise ValueError(
            f"Cannot terminate instance in status '{instance.status}'"
        )

    # Capture the REAL previous status before mutating it
    previous_status = instance.status

    instance.status = "terminating"
    db.commit()
    db.refresh(instance)

    _delete_guacamole_connections(instance, db=db)
    _mark_session_abandoned(instance)
    db.commit()

    # API path: no shared session, let start_task open its own
    task_audit_id = start_task(
        instance.id,
        "terminate",
        metadata={
            "instance_id": str(instance_id),
            "trainee_id": str(trainee_id),
            "previous_status": previous_status,
        },
    )

    try:
        terminate_instance_task.apply_async(
            args=[str(instance.id), str(trainee_id)],
            task_id=str(task_audit_id),
            queue="lab.cleanup",
        )
        logger.info(
            "Celery task enqueued | task_id=%s instance_id=%s",
            task_audit_id,
            instance.id,
        )
    except Exception as e:
        logger.error(
            "Redis down — failed to enqueue task | task_id=%s error=%s",
            task_audit_id,
            e,
        )
        instance.status = "failed"
        instance.error_message = f"Task queue unavailable: {e}"
        db.commit()
        # API path: no shared session
        finish_task(task_audit_id, "failed", str(e))
        raise RuntimeError("Task queue unavailable") from e

    return instance


# ═══════════════════════════════════════════════════════════════════════════════
#  TERMINATE WORKER (Celery)
# ═══════════════════════════════════════════════════════════════════════════════

def run_terminate_worker(
    instance_id: str,
    trainee_id: str,
    task_id: str,
) -> Dict[str, Any]:
    """
    Idempotent terminate worker.

    Re-loads the row with row-level locking, destroys the VM, then marks terminated.
    Short-circuits if vm_uuid is None (clone hasn't committed yet).

    CRITICAL DESIGN: DB session is NOT held across vCenter I/O.
    The session is opened for read/write operations and closed before
    any network call to vCenter. This prevents connection pool exhaustion.
    """
    from uuid import UUID as PyUUID

    task_uuid = PyUUID(task_id)
    instance_uuid = PyUUID(instance_id)

    # Structured logger with task context
    task_logger = log_task(
        logger,
        task_id=task_id,
        instance_id=instance_id,
        trainee_id=trainee_id,
    )

    task_logger.info("Worker started")

    # ═══════════════════════════════════════════════════════════════════════
    #  PHASE 1: Load instance with row lock, validate, mark task running
    # ═══════════════════════════════════════════════════════════════════════
    with background_session() as db:
        mark_running(
            task_uuid,
            worker_pid=os.getpid(),
            worker_host=socket.gethostname(),
            db=db,
        )

        instance = (
            db.query(LabInstance)
            .filter(LabInstance.id == instance_uuid)
            .with_for_update()
            .first()
        )

        if not instance:
            task_logger.error("Instance not found in database")
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return

        if instance.status == "terminated":
            task_logger.info("Instance already terminated — nothing to do")
            finish_task(task_uuid, "completed", "Already terminated", db=db)
            return

        # Short-circuit: clone hasn't committed yet, nothing to destroy
        if not instance.vm_uuid:
            record_event(
                task_uuid,
                instance_uuid,
                "terminate_short_circuit",
                "vm_uuid is None — clone not yet committed, nothing to destroy",
                db=db,
            )
            instance.status = "terminated"
            instance.stopped_at = datetime.utcnow()
            _mark_session_abandoned(instance)
            db.commit()
            finish_task(
                task_uuid,
                "completed",
                "Short-circuit: no VM to destroy",
                db=db,
            )
            task_logger.info("Short-circuit: no VM to destroy")
            return

        # Capture values needed outside the session
        vm_uuid = instance.vm_uuid
        vcenter_host = instance.vcenter_host

        # Commit to release row lock before vCenter I/O
        db.commit()
        task_logger.info(
            "Instance validated | vm_uuid=%s vcenter=%s",
            vm_uuid,
            vcenter_host,
        )

    # ═══════════════════════════════════════════════════════════════════════
    #  PHASE 2: vCenter discovery (NO DB session held)
    # ═══════════════════════════════════════════════════════════════════════
    creds = _find_vcenter_credentials(vcenter_host)
    if not creds:
        _fail_instance(
            instance_uuid,
            task_uuid,
            f"No vCenter credentials found for {vcenter_host}",
            task_logger,
        )
        return

    # ═══════════════════════════════════════════════════════════════════════
    #  PHASE 3: vCenter connect + destroy VM (NO DB session held)
    # ═══════════════════════════════════════════════════════════════════════
    client = VCenterClient(
        host=creds["host"],
        username=creds["username"],
        password=creds["password"],
    )
    if not client.connect():
        _fail_instance(
            instance_uuid,
            task_uuid,
            f"Failed to connect to vCenter {creds['host']}",
            task_logger,
        )
        return

    vm_destroyed = False

    try:
        task_logger.info(
            "vCenter connected | host=%s",
            creds["host"],
        )

        record_event(
            task_uuid,
            instance_uuid,
            "vcenter_destroy_started",
            f"Destroying VM {vm_uuid} on {vcenter_host}",
        )

        vm = client.find_vm_by_uuid(vm_uuid)
        if vm:
            if str(vm.runtime.powerState) == "poweredOn":
                try:
                    task_logger.info("Powering off VM | vm_uuid=%s", vm_uuid)
                    task = vm.PowerOffVM_Task()
                    _call_with_timeout(client._wait_for_task, 120, task)
                    task_logger.info("VM powered off | vm_uuid=%s", vm_uuid)
                except Exception as e:
                    record_event(
                        task_uuid,
                        instance_uuid,
                        "power_off_warning",
                        f"Power off before destroy failed (non-fatal): {e}",
                    )
                    task_logger.warning(
                        "Power off before destroy failed (non-fatal) | vm_uuid=%s error=%s",
                        vm_uuid,
                        e,
                    )

            task_logger.info("Destroying VM | vm_uuid=%s", vm_uuid)
            task = vm.Destroy_Task()
            _call_with_timeout(client._wait_for_task, 180, task)
            vm_destroyed = True

            record_event(
                task_uuid,
                instance_uuid,
                "vcenter_destroy_completed",
                f"Destroyed VM {vm_uuid}",
            )
            task_logger.info("VM destroyed | vm_uuid=%s", vm_uuid)

        else:
            # VM not found in vCenter — probably already deleted manually
            vm_destroyed = True
            record_event(
                task_uuid,
                instance_uuid,
                "vcenter_vm_not_found",
                f"VM {vm_uuid} not found in vCenter — assuming already destroyed",
            )
            task_logger.warning(
                "VM not found in vCenter, assuming already destroyed | vm_uuid=%s",
                vm_uuid,
            )

    except Exception as e:
        record_event(
            task_uuid,
            instance_uuid,
            "vcenter_destroy_failed",
            str(e),
        )
        task_logger.error(
            "vCenter destroy failed | vm_uuid=%s error=%s",
            vm_uuid,
            e,
            exc_info=True,
        )
        # Re-raise to trigger the outer exception handler
        raise

    finally:
        client.disconnect()

    # ═══════════════════════════════════════════════════════════════════════
    #  PHASE 4: Final state persistence (fresh session, atomic commit)
    # ═══════════════════════════════════════════════════════════════════════
    if vm_destroyed:
        with background_session() as db:
            instance = (
                db.query(LabInstance)
                .filter(LabInstance.id == instance_uuid)
                .with_for_update()
                .first()
            )

            if not instance:
                task_logger.error("Instance disappeared before final commit")
                finish_task(
                    task_uuid,
                    "failed",
                    "Instance disappeared before final commit",
                    db=db,
                )
                return

            # Final race check
            if instance.status == "terminated":
                task_logger.info("Instance already terminated by concurrent worker")
                finish_task(task_uuid, "completed", "Already terminated", db=db)
                return

            instance.status = "terminated"
            instance.stopped_at = datetime.utcnow()
            instance.vm_uuid = None
            instance.vm_name = None
            instance.vcenter_host = None
            instance.ip_address = None
            instance.power_state = None
            _mark_session_abandoned(instance)

            db.commit()
            finish_task(task_uuid, "completed", db=db)
            task_logger.info("Worker completed successfully")

            return {
                "instance_id": str(instance_uuid),
                "status": instance.status,
                "vm_uuid": instance.vm_uuid,
                "vm_name": instance.vm_name,
                "vcenter_host": instance.vcenter_host,
                "task_id": str(task_uuid),
                "trainee_id": trainee_id,
                "destroyed": True,
            }

    # Should never reach here, but defensive
    return {
        "instance_id": str(instance_uuid),
        "status": "error",
        "message": "VM destroy was not confirmed",
        "task_id": str(task_uuid),
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _fail_instance(
    instance_id: uuid.UUID,
    task_id: uuid.UUID,
    error_message: str,
    task_logger: logging.LoggerAdapter,
) -> None:
    """
    Mark an instance as failed and finish the audit task.
    Opens its own session since this is called from error paths
    where no session is active.
    """
    with background_session() as db:
        instance = (
            db.query(LabInstance)
            .filter(LabInstance.id == instance_id)
            .first()
        )
        if instance:
            instance.status = "failed"
            instance.error_message = error_message
            db.commit()

        finish_task(task_id, "failed", error_message, db=db)

    task_logger.error("Instance marked failed | error=%s", error_message)
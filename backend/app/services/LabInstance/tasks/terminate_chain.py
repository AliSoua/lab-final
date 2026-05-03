# app/services/LabInstance/tasks/terminate_chain.py
"""
Terminate task chain — 3 idempotent tasks.
Each task: load → verify status → do one thing → persist → enqueue next.
Enhanced with detailed event and task audit logging.
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
from app.services.LabInstance.shared import load_instance_locked
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
    Validates termination request, marks instance as terminating.
    Idempotent: skips if status is already 'terminated'.
    """
    task_uuid = uuid.UUID(task_id)
    instance_uuid = uuid.UUID(instance_id)
    task_start_ts = datetime.now(timezone.utc)
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)

        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed", "error": "Instance not found"}

        # Idempotency: already terminated?
        if instance.status == InstanceStatus.TERMINATED.value:
            task_logger.info("Instance already terminated, skipping validation")
            duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
            record_event(
                task_uuid, instance_uuid, "terminate_validation_skipped",
                "Termination validation skipped: instance already terminated",
                event_code="TERMINATE_SKIPPED",
                metadata={"reason": "already_terminated", "duration_seconds": duration},
                db=db,
            )
            finish_task(task_uuid, "completed", db=db)
            return {"status": "success", "instance_id": instance_id}

        # Capture pre-mutation state
        previous_status = instance.status
        vm_uuid = instance.vm_uuid
        vcenter_host = instance.vcenter_host

        # Record validation start
        record_event(
            task_uuid, instance_uuid, "terminate_validation_started",
            f"Starting termination validation | reason={termination_reason}",
            event_code="TERMINATE_VALIDATION_STARTED",
            metadata={
                "previous_status": previous_status,
                "termination_reason": termination_reason,
                "vm_uuid": vm_uuid,
                "vcenter_host": vcenter_host,
            },
            db=db,
        )

        instance.status = InstanceStatus.TERMINATING.value
        instance.termination_reason = termination_reason
        db.commit()

        duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
        record_event(
            task_uuid, instance_uuid, "terminate_validated",
            "Instance marked as terminating",
            event_code="TERMINATE_VALIDATED",
            metadata={
                "previous_status": previous_status,
                "new_status": InstanceStatus.TERMINATING.value,
                "termination_reason": termination_reason,
                "duration_seconds": duration,
            },
            db=db,
        )
        finish_task(task_uuid, "completed", db=db)

    # Session closed — use captured values only
    if not vm_uuid:
        task_logger.info("No vm_uuid present, skipping destroy and proceeding to cleanup")
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
    Idempotent: skips if status is already 'terminated'.
    """
    task_uuid = uuid.UUID(task_id)
    instance_uuid = uuid.UUID(instance_id)
    task_start_ts = datetime.now(timezone.utc)
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)

        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed", "error": "Instance not found"}

        if instance.status == InstanceStatus.TERMINATED.value:
            task_logger.info("Instance already terminated, skipping destroy")
            duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
            record_event(
                task_uuid, instance_uuid, "destroy_skipped",
                "Destroy skipped: instance already terminated",
                event_code="DESTROY_SKIPPED",
                metadata={"reason": "already_terminated", "duration_seconds": duration},
                db=db,
            )
            finish_task(task_uuid, "completed", db=db)
            return {"status": "success", "instance_id": instance_id}

        vm_uuid = instance.vm_uuid
        vcenter_host = instance.vcenter_host
        db.commit()  # release row lock before external I/O

    # ── No VM to destroy ──
    if not vm_uuid:
        task_logger.info("No vm_uuid associated with instance, skipping destroy")
        duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
        with background_session() as db:
            record_event(
                task_uuid, instance_uuid, "destroy_skipped",
                "Destroy skipped: no vm_uuid associated with instance",
                event_code="DESTROY_SKIPPED_NO_VM",
                metadata={"reason": "no_vm_uuid", "duration_seconds": duration},
                db=db,
            )
            finish_task(task_uuid, "completed", db=db)
        return _enqueue_next(instance_uuid, trainee_id, task_id, "cleanup", vm_destroyed=False)

    # ── Resolve vCenter credentials ──
    creds = _find_vcenter_credentials(vcenter_host)
    if not creds:
        task_logger.error("No vCenter credentials found for host %s", vcenter_host)
        duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
        with background_session() as db:
            record_event(
                task_uuid, instance_uuid, "destroy_skipped",
                f"No vCenter credentials found for host {vcenter_host}",
                event_code="DESTROY_SKIPPED_NO_CREDS",
                severity=EventSeverity.WARNING.value,
                metadata={"reason": "no_vcenter_credentials", "vcenter_host": vcenter_host, "duration_seconds": duration},
                db=db,
            )
            finish_task(task_uuid, "completed", f"No vCenter creds for {vcenter_host}", db=db)
        return _enqueue_next(instance_uuid, trainee_id, task_id, "cleanup", vm_destroyed=False)

    # ── Connect to vCenter ──
    client = VCenterClient(host=creds["host"], username=creds["username"], password=creds["password"])
    if not client.connect():
        task_logger.error("Cannot connect to vCenter %s", vcenter_host)
        duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
        with background_session() as db:
            record_event(
                task_uuid, instance_uuid, "destroy_skipped",
                f"Cannot connect to vCenter {vcenter_host}",
                event_code="DESTROY_SKIPPED_CONNECT_FAILED",
                severity=EventSeverity.WARNING.value,
                metadata={"reason": "vcenter_connect_failed", "vcenter_host": vcenter_host, "duration_seconds": duration},
                db=db,
            )
            finish_task(task_uuid, "completed", f"Cannot connect to {vcenter_host}", db=db)
        return _enqueue_next(instance_uuid, trainee_id, task_id, "cleanup", vm_destroyed=False)

    vm_destroyed = False

    try:
        task_logger.info("Starting VM destroy | vm_uuid=%s vcenter=%s", vm_uuid, vcenter_host)

        with background_session() as db:
            record_event(
                task_uuid, instance_uuid, "destroy_started",
                f"Starting VM destroy | vm_uuid={vm_uuid} vcenter={vcenter_host}",
                event_code="DESTROY_STARTED",
                metadata={"vm_uuid": vm_uuid, "vcenter_host": creds["host"]},
                db=db,
            )
            db.commit()

        vm = client.find_vm_by_uuid(vm_uuid)
        if vm:
            # ── Power off if running ──
            if str(vm.runtime.powerState) == "poweredOn":
                task_logger.info("VM is powered on, initiating power off | vm_uuid=%s", vm_uuid)

                with background_session() as db:
                    record_event(
                        task_uuid, instance_uuid, "power_off_started",
                        f"Powering off VM {vm_uuid} before destroy",
                        event_code="POWER_OFF_STARTED",
                        metadata={"vm_uuid": vm_uuid, "vcenter_host": creds["host"]},
                        db=db,
                    )
                    db.commit()

                try:
                    power_task = vm.PowerOffVM_Task()
                    _call_with_timeout(client._wait_for_task, 120, power_task)
                    task_logger.info("VM powered off successfully | vm_uuid=%s", vm_uuid)

                    with background_session() as db:
                        record_event(
                            task_uuid, instance_uuid, "power_off_completed",
                            "VM powered off successfully before destroy",
                            event_code="POWER_OFF_COMPLETED",
                            metadata={"vm_uuid": vm_uuid, "vcenter_host": creds["host"]},
                            db=db,
                        )
                        db.commit()
                except Exception as e:
                    task_logger.warning("Power off failed (non-fatal): %s", e)
                    with background_session() as db:
                        record_event(
                            task_uuid, instance_uuid, "power_off_failed",
                            f"VM power off failed (non-fatal): {e}",
                            event_code="POWER_OFF_FAILED",
                            severity=EventSeverity.WARNING.value,
                            metadata={"vm_uuid": vm_uuid, "vcenter_host": creds["host"], "error": str(e)},
                            db=db,
                        )
                        db.commit()

            # ── Destroy VM ──
            destroy_task = vm.Destroy_Task()
            _call_with_timeout(client._wait_for_task, 180, destroy_task)
            vm_destroyed = True
            task_logger.info("VM destroyed successfully | vm_uuid=%s", vm_uuid)

            duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
            with background_session() as db:
                record_event(
                    task_uuid, instance_uuid, "destroy_completed",
                    "VM destroyed successfully",
                    event_code="DESTROY_COMPLETED",
                    metadata={"vm_uuid": vm_uuid, "vcenter_host": creds["host"], "duration_seconds": duration},
                    db=db,
                )
                db.commit()

        else:
            vm_destroyed = True
            task_logger.warning("VM not found on vCenter, assuming already destroyed | vm_uuid=%s", vm_uuid)

            duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
            with background_session() as db:
                record_event(
                    task_uuid, instance_uuid, "destroy_completed",
                    "VM not found on vCenter, assuming already destroyed",
                    event_code="DESTROY_COMPLETED_ALREADY_GONE",
                    severity=EventSeverity.WARNING.value,
                    metadata={"vm_uuid": vm_uuid, "vcenter_host": creds["host"], "duration_seconds": duration},
                    db=db,
                )
                db.commit()

    except Exception as e:
        task_logger.error("VM destroy failed: %s", e)
        duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
        with background_session() as db:
            record_event(
                task_uuid, instance_uuid, "destroy_failed",
                f"VM destroy failed: {e}",
                event_code="DESTROY_FAILED",
                severity=EventSeverity.ERROR.value,
                metadata={"vm_uuid": vm_uuid, "vcenter_host": creds["host"], "error": str(e), "duration_seconds": duration},
                db=db,
            )
            db.commit()
        # Still proceed to cleanup — don't leave instance in limbo
    finally:
        client.disconnect()

    with background_session() as db:
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
    Final cleanup: mark terminated, clear session state, remove Redis expiry.
    Idempotent: skips if status is already 'terminated'.
    """
    task_uuid = uuid.UUID(task_id)
    instance_uuid = uuid.UUID(instance_id)
    task_start_ts = datetime.now(timezone.utc)
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)

        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed", "error": "Instance not found"}

        if instance.status == InstanceStatus.TERMINATED.value:
            task_logger.info("Instance already terminated, skipping cleanup")
            duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
            record_event(
                task_uuid, instance_uuid, "cleanup_skipped",
                "Cleanup skipped: instance already terminated",
                event_code="CLEANUP_SKIPPED",
                metadata={"reason": "already_terminated", "duration_seconds": duration},
                db=db,
            )
            finish_task(task_uuid, "completed", db=db)
            return {"status": "success", "instance_id": instance_id}

        # Capture pre-mutation state
        previous_status = instance.status
        previous_session_status = instance.session_state.get("status") if instance.session_state else None
        vm_uuid = instance.vm_uuid
        guacamole_connections = dict(instance.guacamole_connections) if instance.guacamole_connections else {}

        record_event(
            task_uuid, instance_uuid, "cleanup_started",
            "Starting final cleanup: marking terminated, clearing session, removing expiry",
            event_code="CLEANUP_STARTED",
            metadata={
                "previous_status": previous_status,
                "vm_destroyed": vm_destroyed,
                "skip_destroy": skip_destroy,
                "vm_uuid": vm_uuid,
                "guacamole_connection_count": len(guacamole_connections),
            },
            db=db,
        )

        instance.status = InstanceStatus.TERMINATED.value
        instance.stopped_at = datetime.now(timezone.utc)
        instance.power_state = "powered_off"

        # Mark session abandoned
        if instance.session_state:
            session_state = dict(instance.session_state)
            session_state["status"] = "abandoned"
            instance.session_state = session_state

        db.commit()

        record_event(
            task_uuid, instance_uuid, "session_state_updated",
            "Session state marked as abandoned",
            event_code="SESSION_ABANDONED",
            metadata={
                "previous_session_status": previous_session_status,
                "current_session_status": "abandoned",
            },
            db=db,
        )

        # Remove Redis expiry
        redis_removed = False
        redis_error = None
        try:
            remove_instance_expiry(instance_uuid)
            redis_removed = True
            task_logger.info("Redis expiry removed for instance %s", instance_id)
        except Exception as e:
            redis_error = str(e)
            task_logger.warning("Failed to remove Redis expiry: %s", e)

        duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
        record_event(
            task_uuid, instance_uuid, "instance_terminated",
            "Instance terminated successfully",
            event_code="INSTANCE_TERMINATED",
            metadata={
                "previous_status": previous_status,
                "stopped_at": instance.stopped_at.isoformat(),
                "vm_destroyed": vm_destroyed or skip_destroy,
                "skip_destroy": skip_destroy,
                "redis_expiry_removed": redis_removed,
                "redis_error": redis_error,
                "session_state_status": "abandoned",
                "guacamole_connection_count": len(guacamole_connections),
                "duration_seconds": duration,
            },
            db=db,
        )
        finish_task(task_uuid, "completed", db=db)

    task_logger.info("Terminate chain completed successfully")
    return {
        "status": "success",
        "instance_id": instance_id,
        "vm_destroyed": vm_destroyed or skip_destroy,
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _enqueue_next(instance_uuid, trainee_id, current_task_id, next_stage, **kwargs):
    """
    Creates audit task for next stage and enqueues Celery task.
    Records a chain advancement event for observability.
    """
    from app.tasks.lab_instance_tasks import destroy_vm_task, cleanup_task

    task_map = {
        "destroy_vm": destroy_vm_task,
        "cleanup": cleanup_task,
    }

    next_task_fn = task_map.get(next_stage)
    if not next_task_fn:
        raise ValueError(f"Unknown next stage: {next_stage}")

    # Start audit for next task
    next_task_id = start_task(
        instance_uuid,
        task_type=f"terminate.{next_stage}",
        stage=next_stage,
        metadata={"previous_task_id": current_task_id, **kwargs},
    )

    # Enqueue Celery task
    args = [str(instance_uuid), trainee_id, str(next_task_id)]
    if next_stage == "cleanup":
        args.append(kwargs.get("vm_destroyed", False))
        args.append(kwargs.get("skip_destroy", False))

    next_task_fn.apply_async(args=args, task_id=str(next_task_id), queue="lab.cleanup")

    # Record chain advancement event
    with background_session() as db:
        record_event(
            uuid.UUID(current_task_id),
            instance_uuid,
            "task_enqueued",
            f"Enqueued next termination stage: {next_stage}",
            event_code="CHAIN_ADVANCED",
            metadata={
                "next_stage": next_stage,
                "next_task_id": str(next_task_id),
                "previous_task_id": current_task_id,
                "queue": "lab.cleanup",
                **kwargs,
            },
            db=db,
        )
        db.commit()

    return {"status": "enqueued", "next_stage": next_stage, "next_task_id": str(next_task_id)}
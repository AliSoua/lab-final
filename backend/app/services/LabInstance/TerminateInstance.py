# app/services/LabInstance/TerminateInstance.py
"""
Lab Instance Terminate Service
Handles enqueueing terminate requests and the Celery worker destroy body.
"""

import uuid
import os
import socket
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

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
        "[ENQUEUE-TERMINATE] instance=%s trainee=%s",
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
        logger.error("[ENQUEUE-TERMINATE] Instance %s not found", instance_id)
        raise ValueError("Instance not found")

    if instance.status in ("terminating", "terminated"):
        logger.info(
            "[ENQUEUE-TERMINATE] Instance %s already %s, returning as-is",
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
            "[ENQUEUE-TERMINATE] Celery task %s enqueued for instance %s",
            task_audit_id,
            instance.id,
        )
    except Exception as e:
        logger.error(
            "[ENQUEUE-TERMINATE] Redis down — failed to enqueue task %s: %s",
            task_audit_id,
            e,
        )
        instance.status = "failed"
        instance.error_message = f"Task queue unavailable: {e}"
        db.commit()
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
) -> None:
    """
    Idempotent terminate worker.
    Re-loads the row, destroys the VM, then marks terminated.
    Short-circuits if vm_uuid is None (clone hasn't committed yet).
    """
    from uuid import UUID as PyUUID
    from app.utils.db_session import background_session

    task_uuid = PyUUID(task_id)

    with background_session() as db:
        mark_running(
            task_uuid,
            worker_pid=os.getpid(),
            worker_host=socket.gethostname(),
        )

        instance = (
            db.query(LabInstance)
            .filter(LabInstance.id == instance_id)
            .with_for_update()
            .first()
        )
        if not instance:
            logger.error("[TERMINATE-WORKER] Instance %s not found", instance_id)
            finish_task(task_uuid, "failed", "Instance not found")
            return

        if instance.status == "terminated":
            db.commit()
            finish_task(task_uuid, "completed", "Already terminated")
            return

        if not instance.vm_uuid:
            record_event(
                task_uuid,
                instance.id,
                "terminate_short_circuit",
                "vm_uuid is None — clone not yet committed, nothing to destroy",
            )
            instance.status = "terminated"
            instance.stopped_at = datetime.utcnow()
            _mark_session_abandoned(instance)
            db.commit()
            finish_task(task_uuid, "completed", "Short-circuit: no VM to destroy")
            return

        try:
            vm_destroyed = False

            if instance.vm_uuid and instance.vcenter_host:
                record_event(
                    task_uuid,
                    instance.id,
                    "vcenter_destroy_started",
                    f"Destroying VM {instance.vm_uuid} on {instance.vcenter_host}",
                )

                creds = _find_vcenter_credentials(instance.vcenter_host)
                if not creds:
                    raise RuntimeError(
                        f"No vCenter credentials found for {instance.vcenter_host}"
                    )

                client = VCenterClient(
                    host=creds["host"],
                    username=creds["username"],
                    password=creds["password"],
                )
                if not client.connect():
                    raise RuntimeError(
                        f"Failed to connect to vCenter {creds['host']}"
                    )

                try:
                    vm = client.find_vm_by_uuid(instance.vm_uuid)
                    if vm:
                        if str(vm.runtime.powerState) == "poweredOn":
                            try:
                                task = vm.PowerOffVM_Task()
                                _call_with_timeout(client._wait_for_task, 120, task)
                            except Exception as e:
                                record_event(
                                    task_uuid,
                                    instance.id,
                                    "power_off_warning",
                                    f"Power off before destroy failed (non-fatal): {e}",
                                )

                        task = vm.Destroy_Task()
                        _call_with_timeout(client._wait_for_task, 180, task)
                        record_event(
                            task_uuid,
                            instance.id,
                            "vcenter_destroy_completed",
                            f"Destroyed VM {instance.vm_uuid}",
                        )
                    else:
                        # VM not found in vCenter — probably already deleted manually
                        record_event(
                            task_uuid,
                            instance.id,
                            "vcenter_vm_not_found",
                            f"VM {instance.vm_uuid} not found in vCenter — assuming already destroyed",
                        )

                    vm_destroyed = True

                except Exception as e:
                    record_event(
                        task_uuid,
                        instance.id,
                        "vcenter_destroy_failed",
                        str(e),
                    )
                    raise
                finally:
                    client.disconnect()

            if vm_destroyed or not instance.vm_uuid:
                instance.status = "terminated"
                instance.stopped_at = datetime.utcnow()
                _mark_session_abandoned(instance)
                db.commit()
                finish_task(task_uuid, "completed")
            else:
                # Should never reach here, but defensive
                raise RuntimeError("VM destroy was not confirmed")

        except Exception as e:
            logger.error(
                "[TERMINATE-WORKER] Failed for instance %s: %s",
                instance_id,
                e,
                exc_info=True,
            )
            db.rollback()
            instance = (
                db.query(LabInstance)
                .filter(LabInstance.id == instance_id)
                .first()
            )
            if instance:
                instance.status = "failed"
                instance.error_message = str(e)
                db.commit()
            finish_task(task_uuid, "failed", str(e))
            raise
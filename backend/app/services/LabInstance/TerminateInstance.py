# backend/app/services/LabInstance/TerminateInstance.py
"""
Terminate Instance — enqueue only.
"""

import uuid
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from typing import Optional

from app.models.LabDefinition.LabInstance import LabInstance
from app.models.LabInstance.enums import InstanceStatus, TerminationReason
from app.services.LabDefinition.task_audit import start_task
from app.services.LabInstance.utils import _delete_guacamole_connections, _mark_session_abandoned
from app.utils.expiry_queue import remove_instance_expiry

logger = logging.getLogger(__name__)


def enqueue_terminate(
    db: Session,
    instance_id: uuid.UUID,
    trainee_id: uuid.UUID,
    terminated_by_user_id: Optional[uuid.UUID] = None,
    reason: str = TerminationReason.USER_REQUESTED.value,
) -> LabInstance:
    """
    Marks instance as terminating, deletes Guacamole connections,
    then enqueues the terminate task chain.
    """
    from app.tasks.lab_instance_tasks import validate_terminate_task

    instance = (
        db.query(LabInstance)
        .filter(LabInstance.id == instance_id, LabInstance.trainee_id == trainee_id)
        .with_for_update()
        .first()
    )
    if not instance:
        raise ValueError("Instance not found")

    if instance.status in (InstanceStatus.TERMINATING.value, InstanceStatus.TERMINATED.value):
        return instance

    if instance.status not in (
        InstanceStatus.PENDING.value,
        InstanceStatus.PROVISIONING.value,
        InstanceStatus.RUNNING.value,
        InstanceStatus.FAILED.value,
    ):
        raise ValueError(f"Cannot terminate instance in status '{instance.status}'")

    previous_status = instance.status
    instance.status = InstanceStatus.TERMINATING.value
    instance.terminated_by_user_id = terminated_by_user_id
    db.commit()

    # Immediate cleanup
    _delete_guacamole_connections(instance, db=db)
    _mark_session_abandoned(instance)
    db.commit()

    try:
        remove_instance_expiry(instance.id)
    except Exception:
        pass

    task_audit_id = start_task(
        instance.id,
        task_type="terminate.validate_terminate",
        stage="validate_terminate",
        metadata={
            "previous_status": previous_status,
            "termination_reason": reason,
        },
    )

    try:
        validate_terminate_task.apply_async(
            args=[str(instance.id), str(trainee_id), str(task_audit_id), reason],
            task_id=str(task_audit_id),
            queue="lab.cleanup",
        )
    except Exception as e:
        instance.status = InstanceStatus.FAILED.value
        instance.error_message = f"Task queue unavailable: {e}"
        db.commit()
        raise RuntimeError("Task queue unavailable") from e

    return instance
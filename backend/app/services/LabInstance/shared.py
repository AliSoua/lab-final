# app/services/LabInstance/shared.py
"""
Shared helpers for all LabInstance task workers.
"""

import uuid
import logging
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.utils.db_session import background_session
from app.models.LabDefinition.LabInstance import LabInstance
from app.models.LabInstance.enums import InstanceStatus, LaunchStage
from app.services.LabDefinition.task_audit import finish_task, record_event
from app.utils.expiry_queue import remove_instance_expiry

logger = logging.getLogger(__name__)


def load_instance_locked(
    db: Session,
    instance_id: uuid.UUID,
    for_update: bool = True,
) -> Optional[LabInstance]:
    """Load instance with optional row lock."""
    query = db.query(LabInstance).filter(LabInstance.id == instance_id)
    if for_update:
        query = query.with_for_update()
    return query.first()


def is_stage_reached(instance: LabInstance, stage: LaunchStage) -> bool:
    """
    Check if the instance has already reached or passed a given launch stage.
    Uses enum ordering for comparison.
    """
    if not instance.launch_stage:
        return False
    
    stages = list(LaunchStage)
    current_idx = stages.index(LaunchStage(instance.launch_stage)) if instance.launch_stage in [s.value for s in stages] else -1
    target_idx = stages.index(stage)
    return current_idx >= target_idx


def persist_stage(
    instance_id: uuid.UUID,
    stage: LaunchStage,
    updates: Optional[dict] = None,
    task_id: Optional[uuid.UUID] = None,
) -> Optional[LabInstance]:
    """
    Atomically persist a launch stage and optional field updates.
    Returns the refreshed instance.
    """
    with background_session() as db:
        instance = load_instance_locked(db, instance_id)
        if not instance:
            return None
        
        instance.launch_stage = stage.value
        if updates:
            for key, value in updates.items():
                setattr(instance, key, value)
        
        db.commit()
        db.refresh(instance)
        
        if task_id:
            record_event(
                task_id=task_id,
                instance_id=instance_id,
                event_type="stage_persisted",
                event_code="STAGE_PERSISTED",
                message=f"Stage persisted: {stage.value}",
                metadata={"stage": stage.value, "updates": list(updates.keys()) if updates else []},
            )
        
        return instance


def fail_instance(
    instance_id: uuid.UUID,
    task_id: uuid.UUID,
    error_message: str,
    failure_reason: Optional[str] = None,
) -> None:
    """
    Mark instance as failed and finish the audit task.
    """
    with background_session() as db:
        instance = load_instance_locked(db, instance_id, for_update=False)
        if instance:
            instance.status = InstanceStatus.FAILED.value
            instance.error_message = error_message
            if failure_reason:
                instance.failure_reason = failure_reason
            db.commit()
        
        finish_task(task_id, "failed", error_message, db=db)
    
    # Best-effort Redis cleanup
    try:
        remove_instance_expiry(instance_id)
    except Exception:
        pass


def check_termination_race(
    db: Session,
    instance: LabInstance,
    task_id: uuid.UUID,
    task_logger: logging.LoggerAdapter,
) -> bool:
    """
    Check if instance is being terminated. If so, abort gracefully.
    Returns True if race detected (caller should return early).
    """
    if instance.status in (InstanceStatus.TERMINATING.value, InstanceStatus.TERMINATED.value):
        task_logger.info("Race: instance is %s, aborting", instance.status)
        record_event(
            task_id=task_id,
            instance_id=instance.id,
            event_type="task_aborted",
            event_code="TASK_ABORTED_RACE",
            severity="warning",
            message=f"Aborted: instance status is {instance.status}",
            db=db,
        )
        finish_task(task_id, "completed", f"Aborted: instance {instance.status}", db=db)
        return True
    return False
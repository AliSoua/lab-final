# backend/app/services/LabInstance/LaunchInstance.py
"""
Launch Instance — enqueue only.
The actual work is handled by the task chain in tasks/launch_chain.py.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.models.LabDefinition.core import LabDefinition
from app.models.LabDefinition.LabInstance import LabInstance
from app.models.LabInstance.enums import InstanceStatus
from app.services.LabDefinition.task_audit import start_task
from app.services.LabInstance.utils import _compute_max_score, _build_initial_session_state

logger = logging.getLogger(__name__)


def enqueue_launch(
    db: Session,
    lab_definition_id: uuid.UUID,
    trainee_id: uuid.UUID,
    launched_by_user_id: Optional[uuid.UUID] = None,
) -> LabInstance:
    """
    Synchronous enqueue path. Creates instance in 'pending' state,
    then enqueues the first task (validate_instance).
    """
    from app.tasks.lab_instance_tasks import validate_instance_task

    logger.info("[ENQUEUE-LAUNCH] lab=%s trainee=%s", lab_definition_id, trainee_id)

    # 1. Validate lab definition
    lab = db.query(LabDefinition).filter(LabDefinition.id == lab_definition_id).first()
    if not lab or not lab.vms:
        raise ValueError("Lab definition not found or has no VMs")

    # 2. Duplicate-active guard
    existing = (
        db.query(LabInstance)
        .filter(
            LabInstance.lab_definition_id == lab_definition_id,
            LabInstance.trainee_id == trainee_id,
            LabInstance.status.in_([
                InstanceStatus.PENDING.value,
                InstanceStatus.PROVISIONING.value,
                InstanceStatus.RUNNING.value,
            ]),
        )
        .with_for_update()
        .first()
    )
    if existing:
        raise ValueError("An active instance of this lab already exists.")

    # 3. Create instance — NO expires_at yet, NO Redis registration yet
    duration = lab.duration_minutes or 60
    now = datetime.now(timezone.utc)
    instance = LabInstance(
        lab_definition_id=lab_definition_id,
        trainee_id=trainee_id,
        launched_by_user_id=launched_by_user_id,
        guide_version_id=lab.guide_version_id,
        status=InstanceStatus.PENDING.value,
        created_at=now,
        # ← FIX: expires_at is NULL until finalize
        expires_at=None,
        duration_minutes=duration,
        guacamole_connections={},
        current_step_index=0,
    )
    db.add(instance)
    db.flush()

    max_score = _compute_max_score(db, lab.guide_version_id)
    instance.session_state = _build_initial_session_state(
        instance_id=instance.id,
        lab_definition_id=lab_definition_id,
        guide_version_id=lab.guide_version_id,
        trainee_id=trainee_id,
        max_score=max_score,
    )
    # ← FIX: no expires_at in session_state yet — will be set at finalize
    instance.session_state["runtime_context"]["expires_at"] = None

    db.commit()
    db.refresh(instance)

    # ← FIX: Removed register_instance_expiry — will be called at finalize

    # Start audit and enqueue first task
    task_audit_id = start_task(
        instance.id,
        task_type="launch.validate_instance",
        stage="validated",
        metadata={
            "lab_definition_id": str(lab_definition_id),
            "trainee_id": str(trainee_id),
        },
    )

    try:
        validate_instance_task.apply_async(
            args=[str(instance.id), str(trainee_id), str(task_audit_id)],
            task_id=str(task_audit_id),
            queue="lab.provisioning",
        )
    except Exception as e:
        instance.status = InstanceStatus.FAILED.value
        instance.error_message = f"Task queue unavailable: {e}"
        db.commit()
        raise RuntimeError("Task queue unavailable") from e

    return instance
# backend/app/services/LabDefinition/task_audit.py
import uuid
import socket
from datetime import datetime
from typing import Optional, Dict, Any

from app.utils.db_session import background_session
from app.models.LabDefinition.LabInstanceTask import LabInstanceTask
from app.models.LabDefinition.LabInstanceEventLog import LabInstanceEventLog

import logging

logger = logging.getLogger(__name__)


def start_task(
    instance_id: uuid.UUID,
    task_type: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> uuid.UUID:
    """
    Called from the API container before enqueueing to Celery.
    Creates the audit row (status='queued') and a 'task_queued' event.
    Returns the audit row's UUID, which is reused as Celery's task_id.
    """
    with background_session() as db:
        task = LabInstanceTask(
            lab_instance_id=instance_id,
            task_type=task_type,
            status="queued",
            enqueued_at=datetime.utcnow(),
        )
        db.add(task)
        db.flush()  # generate UUID before referencing it in the event

        event = LabInstanceEventLog(
            task_id=task.id,
            lab_instance_id=instance_id,
            event_type="task_queued",
            message=f"Task {task_type} queued for instance {instance_id}",
            metadata_=metadata or {},
        )
        db.add(event)
        # background_session commits on successful exit
        return task.id


def mark_running(
    task_id: uuid.UUID,
    worker_pid: Optional[int] = None,
    worker_host: Optional[str] = None,
) -> None:
    """
    Called from inside the Celery worker as the first line of the task.
    Updates status to 'running' and records worker identity.
    """
    with background_session() as db:
        task = (
            db.query(LabInstanceTask)
            .filter(LabInstanceTask.id == task_id)
            .first()
        )
        if not task:
            # ── FIX: Log warning instead of silent fail ─────────────────────
            logger.warning("mark_running: Task %s not found", task_id)
            return

        task.status = "running"
        task.started_at = datetime.utcnow()
        task.worker_pid = worker_pid
        task.worker_host = worker_host or socket.gethostname()

        event = LabInstanceEventLog(
            task_id=task_id,
            lab_instance_id=task.lab_instance_id,
            event_type="task_started",
            message=(
                f"Task {task.task_type} started on worker "
                f"{task.worker_host}:{task.worker_pid}"
            ),
            metadata_={},
        )
        db.add(event)


def record_event(
    task_id: uuid.UUID,
    instance_id: uuid.UUID,
    event_type: str,
    message: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Record an arbitrary event log entry.
    """
    with background_session() as db:
        event = LabInstanceEventLog(
            task_id=task_id,
            lab_instance_id=instance_id,
            event_type=event_type,
            message=message,
            metadata_=metadata or {},
        )
        db.add(event)


def finish_task(
    task_id: uuid.UUID,
    status: str,  # "completed" | "failed"
    error_message: Optional[str] = None,
) -> None:
    """
    Called when the worker finishes (success or failure).
    Updates the task row and records a terminal event.
    """
    # ── FIX: Validate status to prevent invalid DB values ─────────────────
    valid_statuses = {"completed", "failed"}
    if status not in valid_statuses:
        raise ValueError(
            f"Invalid task status '{status}'. Must be one of: {valid_statuses}"
        )

    with background_session() as db:
        task = (
            db.query(LabInstanceTask)
            .filter(LabInstanceTask.id == task_id)
            .first()
        )
        if not task:
            logger.warning("finish_task: Task %s not found", task_id)
            return

        task.status = status
        task.finished_at = datetime.utcnow()
        if error_message:
            task.error_message = error_message

        event_type = "task_completed" if status == "completed" else "task_failed"
        event = LabInstanceEventLog(
            task_id=task_id,
            lab_instance_id=task.lab_instance_id,
            event_type=event_type,
            message=error_message or f"Task {task.task_type} {status}",
            metadata_={},
        )
        db.add(event)
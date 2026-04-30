# backend/app/services/LabDefinition/task_audit.py
"""
Lab instance task audit service.

Handles creation and lifecycle of LabInstanceTask and LabInstanceEventLog rows.
All functions accept an optional *db* session to allow callers (especially Celery
workers) to reuse an existing transaction, avoiding nested connections and
ensuring atomicity between instance state and audit state.
"""

import uuid
import socket
import logging
from datetime import datetime, timezone  # ← ADD timezone
from typing import Optional, Dict, Any, Union

from sqlalchemy.orm import Session

from app.utils.db_session import background_session
from app.core.logging import log_task
from app.models.LabDefinition.LabInstanceTask import LabInstanceTask
from app.models.LabDefinition.LabInstanceEventLog import LabInstanceEventLog

logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _coerce_uuid(value: Union[str, uuid.UUID]) -> uuid.UUID:
    """Accept str or UUID, always return a UUID."""
    return uuid.UUID(str(value)) if isinstance(value, str) else value


def _get_db(db: Optional[Session]) -> Session:
    """Return the passed session, or raise if None (should not happen inside context)."""
    if db is None:
        raise RuntimeError(
            "Audit function called without a db session. "
            "Pass db= from the caller's background_session context."
        )
    return db


# ── Public API ───────────────────────────────────────────────────────────────

def start_task(
    instance_id: Union[str, uuid.UUID],
    task_type: str,
    metadata: Optional[Dict[str, Any]] = None,
    db: Optional[Session] = None,
) -> uuid.UUID:
    """
    Called from the API container before enqueueing to Celery.
    Creates the audit row (status='queued') and a 'task_queued' event.
    Returns the audit row's UUID, which is reused as Celery's task_id.
    """
    instance_uuid = _coerce_uuid(instance_id)

    def _inner(session: Session) -> uuid.UUID:
        task = LabInstanceTask(
            lab_instance_id=instance_uuid,
            task_type=task_type,
            status="queued",
            enqueued_at=datetime.now(timezone.utc),  # ← FIX: timezone-aware
        )
        session.add(task)
        session.flush()

        event = LabInstanceEventLog(
            task_id=task.id,
            lab_instance_id=instance_uuid,
            event_type="task_queued",
            message=f"Task {task_type} queued for instance {instance_uuid}",
            created_at=datetime.now(timezone.utc),  # ← FIX: explicit timezone-aware
            metadata_=metadata or {},
        )
        session.add(event)
        return task.id

    if db is not None:
        return _inner(db)

    with background_session() as fresh_db:
        task_id = _inner(fresh_db)
        return task_id


def mark_running(
    task_id: Union[str, uuid.UUID],
    worker_pid: Optional[int] = None,
    worker_host: Optional[str] = None,
    db: Optional[Session] = None,
) -> None:
    """
    Called from inside the Celery worker as the first line of the task.
    """
    task_uuid = _coerce_uuid(task_id)
    host = worker_host or socket.gethostname()

    def _inner(session: Session) -> None:
        task = (
            session.query(LabInstanceTask)
            .filter(LabInstanceTask.id == task_uuid)
            .first()
        )
        if not task:
            logger.warning("mark_running: Task %s not found", task_uuid)
            return

        task.status = "running"
        task.started_at = datetime.now(timezone.utc)  # ← FIX
        task.worker_pid = worker_pid
        task.worker_host = host

        event = LabInstanceEventLog(
            task_id=task_uuid,
            lab_instance_id=task.lab_instance_id,
            event_type="task_started",
            message=f"Task {task.task_type} started on worker {host}:{worker_pid}",
            created_at=datetime.now(timezone.utc),  # ← FIX
            metadata_={},
        )
        session.add(event)

    if db is not None:
        _inner(db)
        return

    with background_session() as fresh_db:
        _inner(fresh_db)


def record_event(
    task_id: Union[str, uuid.UUID],
    instance_id: Union[str, uuid.UUID],
    event_type: str,
    message: str,
    metadata: Optional[Dict[str, Any]] = None,
    db: Optional[Session] = None,
) -> None:
    """
    Record an arbitrary event log entry.
    """
    task_uuid = _coerce_uuid(task_id)
    instance_uuid = _coerce_uuid(instance_id)

    def _inner(session: Session) -> None:
        event = LabInstanceEventLog(
            task_id=task_uuid,
            lab_instance_id=instance_uuid,
            event_type=event_type,
            message=message,
            created_at=datetime.now(timezone.utc),  # ← FIX: explicit timezone-aware
            metadata_=metadata or {},
        )
        session.add(event)

    if db is not None:
        _inner(db)
        return

    with background_session() as fresh_db:
        _inner(fresh_db)


def finish_task(
    task_id: Union[str, uuid.UUID],
    status: str,
    error_message: Optional[str] = None,
    db: Optional[Session] = None,
) -> None:
    """
    Called when the worker finishes (success or failure).
    """
    valid_statuses = {"completed", "failed"}
    if status not in valid_statuses:
        raise ValueError(
            f"Invalid task status '{status}'. Must be one of: {valid_statuses}"
        )

    task_uuid = _coerce_uuid(task_id)

    def _inner(session: Session) -> None:
        task = (
            session.query(LabInstanceTask)
            .filter(LabInstanceTask.id == task_uuid)
            .first()
        )
        if not task:
            logger.warning("finish_task: Task %s not found", task_uuid)
            return

        task.status = status
        task.finished_at = datetime.now(timezone.utc)  # ← FIX
        if error_message:
            task.error_message = error_message

        event_type = "task_completed" if status == "completed" else "task_failed"
        event = LabInstanceEventLog(
            task_id=task_uuid,
            lab_instance_id=task.lab_instance_id,
            event_type=event_type,
            message=error_message or f"Task {task.task_type} {status}",
            created_at=datetime.now(timezone.utc),  # ← FIX
            metadata_={},
        )
        session.add(event)

    if db is not None:
        _inner(db)
        return

    with background_session() as fresh_db:
        _inner(fresh_db)
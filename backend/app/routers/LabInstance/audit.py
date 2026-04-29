# app/routers/LabInstance/audit.py
"""
Lab Instance Audit Operations — ADMIN ONLY

All endpoints require moderator or admin role.
Trainee-scoped routes removed: VM/vCenter metadata is security-sensitive.

Endpoints:
  GET /lab-instances/monitoring/tasks/admin   — global monitoring tasks
  GET /lab-instances/monitoring/events/admin  — global monitoring events
  GET /lab-instances/{id}/tasks/admin         — instance tasks (filterable)
  GET /lab-instances/{id}/tasks/{task_id}/admin — single task
  GET /lab-instances/{id}/events/admin        — instance events (filterable)
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import uuid

from app.config.connection.postgres_client import get_db
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.schemas.LabDefinition.LabInstanceTask import (
    LabInstanceTaskResponse,
    LabInstanceTaskListResponse,
)
from app.schemas.LabDefinition.LabInstanceEvent import (
    LabInstanceEventLogResponse,
    LabInstanceEventLogListResponse,
)
from app.models.LabDefinition.LabInstanceTask import LabInstanceTask
from app.models.LabDefinition.LabInstanceEventLog import LabInstanceEventLog
from app.models.LabDefinition.LabInstance import LabInstance as LabInstanceModel

require_admin = require_any_role(["moderator", "admin"])

router = APIRouter(
    prefix="/lab-instances",
    tags=["lab-instances"],
    responses={
        401: {"description": "Unauthorized - Invalid or missing token"},
        403: {"description": "Forbidden - Insufficient permissions"},
        404: {"description": "Lab instance not found"},
    }
)


def _get_instance_admin(db: Session, instance_id: uuid.UUID):
    """Fetch instance without trainee filter. Returns None if not found."""
    return db.query(LabInstanceModel).filter(LabInstanceModel.id == instance_id).first()


# ═══════════════════════════════════════════════════════════════════════════════
#  GLOBAL MONITORING AUDIT — across all instances
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/monitoring/tasks/admin",
    response_model=LabInstanceTaskListResponse,
    summary="List all monitoring tasks across instances (admin/moderator)",
)
def list_monitoring_tasks_admin(
    task_type: Optional[str] = Query(None, description="Exact task_type, e.g. monitoring.session_timeout"),
    status: Optional[str] = Query(None, description="queued | running | completed | failed"),
    instance_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_admin),
):
    """
    Returns every LabInstanceTask whose task_type starts with `monitoring.`.
    Useful for reviewing auto-terminations and health-check actions platform-wide.
    """
    query = db.query(LabInstanceTask).filter(
        LabInstanceTask.task_type.like("monitoring.%")
    )

    if task_type:
        query = query.filter(LabInstanceTask.task_type == task_type)
    if status:
        query = query.filter(LabInstanceTask.status == status)
    if instance_id:
        query = query.filter(LabInstanceTask.lab_instance_id == instance_id)

    total = query.count()
    items = (
        query.order_by(LabInstanceTask.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return LabInstanceTaskListResponse(
        items=[LabInstanceTaskResponse.model_validate(t) for t in items],
        total=total,
    )


@router.get(
    "/monitoring/events/admin",
    response_model=LabInstanceEventLogListResponse,
    summary="List all monitoring events across instances (admin/moderator)",
)
def list_monitoring_events_admin(
    event_type: Optional[str] = Query(None, description="Exact event_type, e.g. instance_auto_terminated"),
    instance_id: Optional[uuid.UUID] = None,
    task_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_admin),
):
    """
    Returns every event log whose parent task is a monitoring task.
    """
    query = (
        db.query(LabInstanceEventLog)
        .join(LabInstanceTask, LabInstanceEventLog.task_id == LabInstanceTask.id)
        .filter(LabInstanceTask.task_type.like("monitoring.%"))
    )

    if event_type:
        query = query.filter(LabInstanceEventLog.event_type == event_type)
    if instance_id:
        query = query.filter(LabInstanceEventLog.lab_instance_id == instance_id)
    if task_id:
        query = query.filter(LabInstanceEventLog.task_id == task_id)

    total = query.count()
    items = (
        query.order_by(LabInstanceEventLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return LabInstanceEventLogListResponse(
        items=[LabInstanceEventLogResponse.model_validate(e) for e in items],
        total=total,
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  INSTANCE-SCOPED ADMIN ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/{instance_id}/tasks/admin",
    response_model=LabInstanceTaskListResponse,
    summary="List audit tasks for a lab instance (admin/moderator)",
)
def list_instance_tasks_admin(
    instance_id: uuid.UUID,
    task_type: Optional[str] = Query(None, description="Filter by exact task_type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_admin),
):
    instance = _get_instance_admin(db, instance_id)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found",
        )

    query = db.query(LabInstanceTask).filter(
        LabInstanceTask.lab_instance_id == instance_id
    )
    if task_type:
        query = query.filter(LabInstanceTask.task_type == task_type)
    if status:
        query = query.filter(LabInstanceTask.status == status)

    total = query.count()
    items = (
        query.order_by(LabInstanceTask.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return LabInstanceTaskListResponse(
        items=[LabInstanceTaskResponse.model_validate(t) for t in items],
        total=total,
    )


@router.get(
    "/{instance_id}/tasks/{task_id}/admin",
    response_model=LabInstanceTaskResponse,
    summary="Get a single audit task (admin/moderator)",
)
def get_instance_task_admin(
    instance_id: uuid.UUID,
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_admin),
):
    instance = _get_instance_admin(db, instance_id)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found",
        )

    task = (
        db.query(LabInstanceTask)
        .filter(
            LabInstanceTask.id == task_id,
            LabInstanceTask.lab_instance_id == instance_id,
        )
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return task


@router.get(
    "/{instance_id}/events/admin",
    response_model=LabInstanceEventLogListResponse,
    summary="List audit events for a lab instance (admin/moderator)",
)
def list_instance_events_admin(
    instance_id: uuid.UUID,
    event_type: Optional[str] = Query(None, description="Filter by exact event_type"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_admin),
):
    instance = _get_instance_admin(db, instance_id)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found",
        )

    query = db.query(LabInstanceEventLog).filter(
        LabInstanceEventLog.lab_instance_id == instance_id
    )
    if event_type:
        query = query.filter(LabInstanceEventLog.event_type == event_type)

    total = query.count()
    items = (
        query.order_by(LabInstanceEventLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return LabInstanceEventLogListResponse(
        items=[LabInstanceEventLogResponse.model_validate(e) for e in items],
        total=total,
    )
# app/routers/LabInstance/audit.py
"""
Lab Instance Audit Operations
GET /lab-instances/{id}/tasks
GET /lab-instances/{id}/tasks/{task_id}
GET /lab-instances/{id}/events
"""

from fastapi import APIRouter, Depends, HTTPException, status
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
from app.services.LabInstance.ManageInstance import get_instance
from .common import get_trainee_id

require_all = require_any_role(["trainee", "moderator", "admin"])

router = APIRouter(
    prefix="/lab-instances",
    tags=["lab-instances"],
    responses={
        401: {"description": "Unauthorized - Invalid or missing token"},
        403: {"description": "Forbidden - Insufficient permissions"},
        404: {"description": "Lab instance not found"},
    }
)


@router.get(
    "/{instance_id}/tasks",
    response_model=LabInstanceTaskListResponse,
    summary="List audit tasks for a lab instance",
)
def list_instance_tasks(
    instance_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    trainee_id = get_trainee_id(userinfo, db)
    instance = get_instance(db, instance_id, trainee_id)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found",
        )

    query = db.query(LabInstanceTask).filter(
        LabInstanceTask.lab_instance_id == instance_id
    )
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
    "/{instance_id}/tasks/{task_id}",
    response_model=LabInstanceTaskResponse,
    summary="Get a single audit task",
)
def get_instance_task(
    instance_id: uuid.UUID,
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    trainee_id = get_trainee_id(userinfo, db)
    instance = get_instance(db, instance_id, trainee_id)
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
    "/{instance_id}/events",
    response_model=LabInstanceEventLogListResponse,
    summary="List audit events for a lab instance",
)
def list_instance_events(
    instance_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    trainee_id = get_trainee_id(userinfo, db)
    instance = get_instance(db, instance_id, trainee_id)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found",
        )

    query = db.query(LabInstanceEventLog).filter(
        LabInstanceEventLog.lab_instance_id == instance_id
    )
    total = query.count()
    items = (
        query.order_by(LabInstanceEventLog.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return LabInstanceEventLogListResponse(
        items=[LabInstanceEventLogResponse.model_validate(e) for e in items],
        total=total,
    )
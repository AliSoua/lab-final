# app/routers/LabInstance/core.py
"""
Core Lab Instance Operations
GET /lab-instances/ and GET /lab-instances/{id}
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timezone
from sqlalchemy.sql import desc

from app.config.connection.postgres_client import get_db
from app.dependencies.keycloak.keycloak_roles import require_any_role
from sqlalchemy.orm import joinedload
from app.models.LabDefinition.LabInstance import LabInstance
from app.schemas.LabDefinition.lab_instance import (
    LabInstanceResponse,
    LabInstanceListResponse,
    MyLabInstanceListResponse,
    MyLabInstanceSummary,
    LabDefinitionSummary,
)
from typing import List, Optional
from app.services.LabInstance.ManageInstance import get_instance, list_instances
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
    "/{instance_id}/admin",
    response_model=LabInstanceResponse,
    summary="Get any lab instance details (admin/moderator)",
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Instance not found"},
    },
)
def get_instance_admin(
    instance_id: uuid.UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["moderator", "admin"])),
):
    """
    Fetch a single instance without trainee ownership check.
    """
    instance = db.query(LabInstance).filter(LabInstance.id == instance_id).first()
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found",
        )
    return instance

@router.get(
    "/all",
    response_model=LabInstanceListResponse,
    summary="List all lab instances (admin/moderator)",
    responses={
        401: {"description": "Unauthorized - Invalid or missing token"},
        403: {"description": "Forbidden - Admin or moderator access required"},
    },
)
def list_all_instances_admin(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["moderator", "admin"])),
):
    """
    Returns every lab instance in the system, ordered by most recent first.
    Restricted to moderators and admins.
    """
    from app.services.LabInstance.ManageInstance import list_all_instances

    items, total = list_all_instances(db, skip, limit)
    return LabInstanceListResponse(items=items, total=total)

# ── TRAINEE ENDPOINTS ────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=MyLabInstanceListResponse,   # <-- changed
    summary="List my lab instances",
)
def list_my_instances(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    trainee_id = get_trainee_id(userinfo, db)

    query = (
        db.query(LabInstance)
        .options(joinedload(LabInstance.lab_definition))
        .filter(LabInstance.trainee_id == trainee_id)
    )

    total = query.count()
    instances = (
        query.order_by(desc(LabInstance.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )

    now = datetime.now(timezone.utc)
    items: List[MyLabInstanceSummary] = []

    for inst in instances:
        lab_def = inst.lab_definition

        # Calculate time remaining (guards against naive datetimes)
        remaining: Optional[int] = None
        if inst.expires_at:
            expires = inst.expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            delta = expires - now
            remaining = max(int(delta.total_seconds() // 60), 0)

        items.append(
            MyLabInstanceSummary(
                id=inst.id,
                lab_definition=LabDefinitionSummary(
                    id=lab_def.id,
                    name=lab_def.name,
                    difficulty=getattr(lab_def, "difficulty", None),
                    track=getattr(lab_def, "track", None),
                    category=getattr(lab_def, "category", None),
                ),
                status=inst.status,
                power_state=inst.power_state,
                created_at=inst.created_at,
                started_at=inst.started_at,
                stopped_at=inst.stopped_at,
                expires_at=inst.expires_at,
                duration_minutes=inst.duration_minutes,
                time_remaining_minutes=remaining,
                current_step_index=inst.current_step_index,
            )
        )

    return MyLabInstanceListResponse(items=items, total=total)


@router.get(
    "/{instance_id}",
    response_model=LabInstanceResponse,
    summary="Get lab instance details",
)
def get_instance_detail(
    instance_id: uuid.UUID,
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
    return instance
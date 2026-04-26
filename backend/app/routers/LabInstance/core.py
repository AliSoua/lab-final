# app/routers/LabInstance/core.py
"""
Core Lab Instance Operations
GET /lab-instances/ and GET /lab-instances/{id}
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.config.connection.postgres_client import get_db
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.schemas.LabDefinition.lab_instance import (
    LabInstanceResponse,
    LabInstanceListResponse,
)
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
    "/",
    response_model=LabInstanceListResponse,
    summary="List my lab instances",
)
def list_my_instances(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    trainee_id = get_trainee_id(userinfo, db)
    items, total = list_instances(db, trainee_id, skip, limit)
    return LabInstanceListResponse(items=items, total=total)


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
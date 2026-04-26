# app/routers/LabInstance/runtime.py
"""
Lab Instance Runtime Operations
POST /lab-instances/{id}/refresh
GET /lab-instances/{id}/guide-version
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.config.connection.postgres_client import get_db
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.schemas.LabDefinition.lab_instance import LabInstanceResponse
from app.schemas.LabDefinition.LabGuide import GuideVersionResponse
from app.services.LabInstance.ManageInstance import get_instance, refresh_instance_status
from app.services.LabGuide.guide_service import get_version
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


@router.post(
    "/{instance_id}/refresh",
    response_model=LabInstanceResponse,
    summary="Refresh instance status from vCenter and sync Guacamole connections",
)
def refresh_instance(
    instance_id: uuid.UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    trainee_id = get_trainee_id(userinfo, db)
    try:
        instance = refresh_instance_status(db, instance_id, trainee_id)
        if not instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instance not found",
            )
        return instance
    except HTTPException:
        raise
    except TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Refresh timed out while communicating with vCenter",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh status: {str(e)}",
        )


# ── NEW: Public endpoint for trainees to fetch their instance's guide version ──
@router.get(
    "/{instance_id}/guide-version",
    response_model=GuideVersionResponse,
    summary="Get the guide version for a running lab instance",
)
def get_instance_guide_version(
    instance_id: uuid.UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    """
    Returns the guide version pinned to this instance.
    Trainees can only access their own instances' guide versions.
    """
    trainee_id = get_trainee_id(userinfo, db)
    
    instance = get_instance(db, instance_id, trainee_id)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found",
        )
    
    if not instance.guide_version_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No guide version assigned to this instance",
        )
    
    version = get_version(db, instance.guide_version_id)
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guide version not found",
        )
    
    return version
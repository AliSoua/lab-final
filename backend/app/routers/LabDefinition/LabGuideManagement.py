# app/routers/LabDefinition/LabGuideManagement.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.config.connection.postgres_client import get_db
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.services.LabDefinition.permissions import LabPermissions
from app.services.LabDefinition.lab_service import LabService
from app.services.LabGuide.guide_service import (
    get_version,
    assign_guide_version_to_lab,
)
from app.schemas.LabDefinition.LabGuide import GuideVersionResponse
from app.models.LabDefinition.core import LabDefinition
from pydantic import BaseModel

router = APIRouter()
require_admin_or_moderator = require_any_role(["admin", "moderator"])
lab_service = LabService()


def _get_lab(db: Session, lab_id: UUID, user: dict) -> LabDefinition:
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab definition not found")
    LabPermissions.check_ownership(lab, user)
    return lab


@router.get(
    "/{lab_id}/guide-version",
    response_model=GuideVersionResponse,
    summary="Get assigned guide version for lab",
)
def get_lab_guide_version(
    lab_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator),
):
    """
    Retrieve the immutable guide version currently assigned to this lab definition.
    """
    lab = _get_lab(db, lab_id, current_user)
    if not lab.guide_version_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No guide version assigned to this lab",
        )

    version = get_version(db, lab.guide_version_id)
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned guide version not found",
        )
    return version


class _AssignGuideVersionPayload(BaseModel):
    guide_version_id: UUID


@router.put(
    "/{lab_id}/guide-version",
    summary="Assign a guide version to lab",
)
def assign_guide_version_to_lab_endpoint(
    lab_id: UUID,
    payload: _AssignGuideVersionPayload,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator),
):
    """
    Link an existing published GuideVersion to this lab definition.
    """
    lab = _get_lab(db, lab_id, current_user)
    updated_lab = assign_guide_version_to_lab(db, payload.guide_version_id, lab.id)
    return {
        "message": f"Guide version assigned to lab '{updated_lab.name}'",
        "lab_id": str(updated_lab.id),
        "guide_version_id": str(updated_lab.guide_version_id),
    }


@router.delete(
    "/{lab_id}/guide-version",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unassign guide version from lab",
)
def unassign_lab_guide_version(
    lab_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator),
):
    """
    Remove the guide version link from this lab definition (does NOT delete the version).
    """
    lab = _get_lab(db, lab_id, current_user)
    lab.guide_version_id = None
    db.commit()
    return None
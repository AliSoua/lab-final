# app/routers/LabDefinition/LabGuideManagement.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.config.connection.postgres_client import get_db
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.services.LabDefinition.permissions import LabPermissions
from app.services.LabDefinition.lab_service import LabService
from app.services.LabGuide.guide_service import get_guide_with_steps, assign_guide_to_lab
from app.schemas.LabDefinition.LabGuide import LabGuideResponse
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
    "/{lab_id}/guide",
    response_model=LabGuideResponse,
    summary="Get assigned guide for lab",
)
def get_lab_guide(
    lab_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator),
):
    """
    Retrieve the standalone guide currently assigned to this lab definition.
    """
    lab = _get_lab(db, lab_id, current_user)
    if not lab.guide_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No guide assigned to this lab",
        )

    guide = get_guide_with_steps(db, lab.guide_id)
    if not guide:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned guide not found",
        )
    return guide


class _AssignGuidePayload(BaseModel):
    guide_id: UUID


@router.put(
    "/{lab_id}/guide",
    summary="Assign a guide to lab",
)
def assign_guide_to_lab_endpoint(
    lab_id: UUID,
    payload: _AssignGuidePayload,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator),
):
    """
    Link an existing standalone LabGuide to this lab definition.
    """
    lab = _get_lab(db, lab_id, current_user)
    updated_lab = assign_guide_to_lab(db, payload.guide_id, lab.id)
    return {
        "message": f"Guide assigned to lab '{updated_lab.name}'",
        "lab_id": str(updated_lab.id),
        "guide_id": str(updated_lab.guide_id),
    }


@router.delete(
    "/{lab_id}/guide",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unassign guide from lab",
)
def unassign_lab_guide(
    lab_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator),
):
    """
    Remove the guide link from this lab definition (does NOT delete the guide).
    """
    lab = _get_lab(db, lab_id, current_user)
    lab.guide_id = None
    db.commit()
    return None
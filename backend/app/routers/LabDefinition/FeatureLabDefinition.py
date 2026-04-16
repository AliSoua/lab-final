# app/routers/LabDefinition/FeatureLabDefinition.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.config.connection.postgres_client import get_db
from app.services.LabDefinition.lab_service import LabService
from app.schemas.LabDefinition.core import FeatureLabDefinition, LabDefinitionResponse
from app.dependencies.keycloak.keycloak_roles import require_role
from app.services.LabDefinition.permissions import LabPermissions

router = APIRouter()
require_admin = require_role("admin")  # Only admins can feature/unfeature
lab_service = LabService()


@router.post(
    "/{lab_id}/feature",
    response_model=LabDefinitionResponse,
    summary="Feature a lab (set is_featured=true)",
)
def feature_lab(
    lab_id: UUID,
    priority: int = 0,  # Optional query param for priority
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """
    Mark a lab as featured for the hero section.
    
    - **Admin only**
    - Sets is_featured=True and optionally sets featured_priority
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    if lab.status != "published":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only published labs can be featured"
        )
    
    update_data = FeatureLabDefinition(
        is_featured=True,
        featured_priority=priority,
        updated_by=current_user["sub"]
    )
    
    return lab_service.update_lab(db, lab, update_data)


@router.post(
    "/{lab_id}/unfeature",
    response_model=LabDefinitionResponse,
    summary="Unfeature a lab (set is_featured=false)",
)
def unfeature_lab(
    lab_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """
    Remove a lab from featured section.
    
    - **Admin only**
    - Sets is_featured=False and resets featured_priority to 0
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    update_data = FeatureLabDefinition(
        is_featured=False,
        featured_priority=0,
        updated_by=current_user["sub"]
    )
    
    return lab_service.update_lab(db, lab, update_data)


@router.post(
    "/{lab_id}/priority",
    response_model=LabDefinitionResponse,
    summary="Update featured priority for a lab",
)
def update_featured_priority(
    lab_id: UUID,
    priority: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """
    Update the display priority of a featured lab.
    
    - **Admin only**
    - Lower numbers appear first in the hero carousel
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    if not lab.is_featured:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lab must be featured before setting priority"
        )
    
    update_data = FeatureLabDefinition(
        featured_priority=priority,
        updated_by=current_user["sub"]
    )
    
    return lab_service.update_lab(db, lab, update_data)
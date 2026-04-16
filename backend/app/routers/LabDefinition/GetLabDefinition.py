# app/routers/LabDefinition/GetLabDefinition.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.config.connection.postgres_client import get_db
from app.services.LabDefinition.lab_service import LabService
from app.services.LabDefinition.lab_vm_service import LabVMService
from app.services.LabDefinition.lab_guide_service import LabGuideService
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.services.LabDefinition.permissions import LabPermissions
from app.schemas.LabDefinition.full_lab import FullLabDefinitionResponse

router = APIRouter()
require_admin_or_moderator = require_any_role(["admin", "moderator"])
lab_service = LabService()
vm_service = LabVMService()
guide_service = LabGuideService()


@router.get(
    "/{lab_id}",
    response_model=FullLabDefinitionResponse,
    summary="Get lab definition with VMs and Guide"
)
def get_lab_definition(
    lab_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Get complete lab definition including all VM configurations and Guide blocks.
    
    - **Admin**: can access any lab
    - **Moderator**: can only access labs they created
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    LabPermissions.check_ownership(lab, current_user)
    
    # Load relationships
    lab.vms = vm_service.get_by_lab(db, lab_id)
    lab.guide_blocks = guide_service.get_by_lab(db, lab_id)
    
    return lab


@router.get(
    "/slug/{slug}",
    response_model=FullLabDefinitionResponse,
    summary="Get lab by slug"
)
def get_lab_by_slug(
    slug: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Retrieve lab definition by its URL-friendly slug.
    
    - **Admin**: can access any lab
    - **Moderator**: can only access labs they created
    """
    lab = lab_service.get_by_slug(db, slug)
    if not lab:
        raise HTTPException(404, f"Lab with slug '{slug}' not found")
    
    LabPermissions.check_ownership(lab, current_user)
    
    lab.vms = vm_service.get_by_lab(db, lab.id)
    lab.guide_blocks = guide_service.get_by_lab(db, lab.id)
    
    return lab


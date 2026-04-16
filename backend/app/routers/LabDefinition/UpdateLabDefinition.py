# app/routers/LabDefinition/UpdateLabDefinition.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.config.connection.postgres_client import get_db
from app.services.LabDefinition.lab_service import LabService
from app.schemas.LabDefinition.core import LabDefinitionUpdate, LabDefinitionResponse
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.services.LabDefinition.permissions import LabPermissions

router = APIRouter()
require_admin_or_moderator = require_any_role(["admin", "moderator"])
lab_service = LabService()


@router.put(
    "/{lab_id}",
    response_model=LabDefinitionResponse,
    summary="Update lab metadata",
)
def update_lab_definition(
    lab_id: UUID,
    data: LabDefinitionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Update lab definition fields. Does not modify VMs.
    
    - **Admin**: can update any lab
    - **Moderator**: can only update labs they created
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    LabPermissions.check_ownership(lab, current_user)
    
    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_by"] = current_user["sub"]
    
    return lab_service.update_lab(db, lab, LabDefinitionUpdate(**update_data))
# app/routers/LabDefinition/PublishLabDefinition.py

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


@router.post(
    "/{lab_id}/publish",
    response_model=LabDefinitionResponse,
    summary="Publish lab (change status to published)",
)
def publish_lab(
    lab_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Change lab status from draft to published.
    
    - **Admin**: can publish any lab
    - **Moderator**: can only publish labs they created
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab not found")
    
    LabPermissions.check_ownership(lab, current_user)
    
    update_data = LabDefinitionUpdate(
        status="published",
        updated_by=current_user["sub"]
    )
    return lab_service.update_lab(db, lab, update_data)
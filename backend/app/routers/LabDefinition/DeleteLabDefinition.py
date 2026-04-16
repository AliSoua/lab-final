# app/routers/LabDefinition/DeleteLabDefinition.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.config.connection.postgres_client import get_db
from app.services.LabDefinition.lab_service import LabService
from app.services.LabDefinition.lab_vm_service import LabVMService
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.services.LabDefinition.permissions import LabPermissions

router = APIRouter()
require_admin_or_moderator = require_any_role(["admin", "moderator"])
lab_service = LabService()
vm_service = LabVMService()


@router.delete(
    "/{lab_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete lab definition",
)
def delete_lab_definition(
    lab_id: UUID,
    force: bool = False,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Delete lab definition.
    
    - **Admin**: can delete any lab
    - **Moderator**: can only delete labs they created
    
    Set `force=true` to cascade delete all associated VMs.
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    LabPermissions.check_ownership(lab, current_user)
    
    vms = vm_service.get_by_lab(db, lab_id)
    if vms and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lab has {len(vms)} VMs. Use ?force=true to cascade delete."
        )
    
    if vms and force:
        for vm in vms:
            vm_service.delete(db, vm)
    
    lab_service.delete_lab(db, lab)
    return None
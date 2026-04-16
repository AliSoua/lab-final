# app/routers/LabDefinition/LabVMManagement.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.config.connection.postgres_client import get_db
from app.services.LabDefinition.lab_service import LabService
from app.services.LabDefinition.lab_vm_service import LabVMService
from app.schemas.LabDefinition.LabVM import LabVMCreate, LabVMUpdate, LabVMResponse
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.services.LabDefinition.permissions import LabPermissions

router = APIRouter()
require_admin_or_moderator = require_any_role(["admin", "moderator"])
lab_service = LabService()
vm_service = LabVMService()


@router.post(
    "/{lab_id}/vms",
    response_model=LabVMResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add VM to existing lab",
)
def add_vm_to_lab(
    lab_id: UUID,
    data: LabVMCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Add a VM configuration to an existing lab definition.
    
    - **Admin**: can add VMs to any lab
    - **Moderator**: can only add VMs to labs they created
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    LabPermissions.check_ownership(lab, current_user)
    
    vm_data = data.model_dump()
    vm_data["lab_id"] = lab_id
    
    return vm_service.create(db, LabVMCreate(**vm_data))


@router.get(
    "/{lab_id}/vms",
    response_model=List[LabVMResponse],
    summary="List VMs for lab",
)
def list_lab_vms(
    lab_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Get all VM configurations for a specific lab.
    
    - **Admin**: can view VMs of any lab
    - **Moderator**: can only view VMs of labs they created
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    LabPermissions.check_ownership(lab, current_user)
    
    return vm_service.get_by_lab(db, lab_id)


@router.put(
    "/{lab_id}/vms/{vm_id}",
    response_model=LabVMResponse,
    summary="Update VM configuration",
)
def update_vm(
    lab_id: UUID,
    vm_id: UUID,
    data: LabVMUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Update a specific VM within a lab.
    
    - **Admin**: can update VMs in any lab
    - **Moderator**: can only update VMs in labs they created
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    LabPermissions.check_ownership(lab, current_user)
    
    vm = vm_service.get(db, vm_id)
    if not vm or str(vm.lab_id) != str(lab_id):
        raise HTTPException(404, "VM not found in this lab")
    
    return vm_service.update(db, vm, data)


@router.delete(
    "/{lab_id}/vms/{vm_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove VM from lab",
)
def delete_vm(
    lab_id: UUID,
    vm_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Remove a VM configuration from a lab.
    
    - **Admin**: can delete VMs from any lab
    - **Moderator**: can only delete VMs from labs they created
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    LabPermissions.check_ownership(lab, current_user)
    
    vm = vm_service.get(db, vm_id)
    if not vm or str(vm.lab_id) != str(lab_id):
        raise HTTPException(404, "VM not found in this lab")
    
    vm_service.delete(db, vm)
    return None
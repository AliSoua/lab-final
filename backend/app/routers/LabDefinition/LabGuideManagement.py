# app/routers/LabDefinition/LabGuideManagement.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.config.connection.postgres_client import get_db
from app.services.LabDefinition.lab_service import LabService
from app.services.LabDefinition.lab_guide_service import LabGuideService
from app.schemas.LabDefinition.LabGuideBlock import (
    LabGuideBlockCreate, 
    LabGuideBlockUpdate, 
    LabGuideBlockResponse
)
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.services.LabDefinition.permissions import LabPermissions

router = APIRouter()
require_admin_or_moderator = require_any_role(["admin", "moderator"])
lab_service = LabService()
guide_service = LabGuideService()


@router.post(
    "/{lab_id}/guide-blocks",
    response_model=LabGuideBlockResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add guide block to lab",
)
def add_guide_block(
    lab_id: UUID,
    data: LabGuideBlockCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Add a guide block (text or cmd) to an existing lab.
    
    - **Admin**: can add to any lab
    - **Moderator**: can only add to labs they created
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    LabPermissions.check_ownership(lab, current_user)
    
    # Validate single block
    guide_service.validate_guide([data])
    
    return guide_service.create(db, lab_id, data)


@router.get(
    "/{lab_id}/guide-blocks",
    response_model=List[LabGuideBlockResponse],
    summary="List guide blocks for lab",
)
def list_guide_blocks(
    lab_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Get all guide blocks for a specific lab in order.
    
    - **Admin**: can view any lab's guide
    - **Moderator**: can only view their own labs' guides
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    LabPermissions.check_ownership(lab, current_user)
    
    return guide_service.get_by_lab(db, lab_id)


@router.put(
    "/{lab_id}/guide-blocks/{block_id}",
    response_model=LabGuideBlockResponse,
    summary="Update guide block",
)
def update_guide_block(
    lab_id: UUID,
    block_id: UUID,
    data: LabGuideBlockUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Update a specific guide block.
    
    - **Admin**: can update any lab's blocks
    - **Moderator**: can only update their own labs' blocks
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    LabPermissions.check_ownership(lab, current_user)
    
    block = guide_service.get(db, block_id)
    if not block or str(block.lab_id) != str(lab_id):
        raise HTTPException(404, "Guide block not found in this lab")
    
    return guide_service.update(db, block, data)


@router.delete(
    "/{lab_id}/guide-blocks/{block_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete guide block",
)
def delete_guide_block(
    lab_id: UUID,
    block_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Remove a guide block from a lab.
    
    - **Admin**: can delete from any lab
    - **Moderator**: can only delete from their own labs
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    LabPermissions.check_ownership(lab, current_user)
    
    block = guide_service.get(db, block_id)
    if not block or str(block.lab_id) != str(lab_id):
        raise HTTPException(404, "Guide block not found in this lab")
    
    guide_service.delete(db, block)
    return None


@router.post(
    "/{lab_id}/guide-blocks/reorder",
    response_model=List[LabGuideBlockResponse],
    summary="Reorder guide blocks",
)
def reorder_guide_blocks(
    lab_id: UUID,
    block_orders: List[UUID],  # List of block IDs in new order
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Reorder guide blocks by providing a list of block IDs in the desired order.
    
    Example: `["uuid-3", "uuid-1", "uuid-2"]` sets block 3 first, then 1, then 2.
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    LabPermissions.check_ownership(lab, current_user)
    
    return guide_service.reorder_blocks(db, lab_id, block_orders)
# app/routers/LabInstance/UpdateLabInstance.py
"""
Lab Instance Update Router
==========================

Update lab instance state and progress.

USER ENDPOINTS:
- PATCH /lab-instances/{instance_id} - Update progress, notes, etc.
- POST /lab-instances/{instance_id}/pause - Pause instance
- POST /lab-instances/{instance_id}/resume - Resume instance
- POST /lab-instances/{instance_id}/stop - Stop instance
- POST /lab-instances/{instance_id}/extend - Extend time

ADMIN ENDPOINTS:
- POST /lab-instances/{instance_id}/force-stop - Force stop any instance
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from app.config.connection.postgres_client import get_async_db
from app.schemas.LabInstance import (
    LabInstanceUpdate, 
    LabInstanceResponse, 
    LabInstanceStatus
)
from app.services.LabInstance import LabInstanceService
from app.dependencies.keycloak.keycloak_roles import require_any_role

router = APIRouter()

require_any_auth = require_any_role(["trainee", "moderator", "admin"])
require_admin_or_moderator = require_any_role(["admin", "moderator"])


@router.patch(
    "/{instance_id}",
    response_model=LabInstanceResponse,
    summary="Update lab instance",
)
async def update_lab_instance(
    instance_id: UUID,
    data: LabInstanceUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(require_any_auth),
):
    """
    Update lab instance properties.
    
    Allowed updates:
    - **current_step**: Update progress through guide
    - **percent_complete**: Overall completion percentage
    - **user_notes**: Personal notes about the session
    - **rating**: 1-5 star rating (post-completion)
    - **feedback**: Text feedback (post-completion)
    - **is_pinned**: Pin to dashboard
    
    State changes (pause/resume) should use dedicated endpoints.
    """
    service = LabInstanceService(db)
    user_id = UUID(current_user["sub"])
    
    try:
        instance = await service.update_instance(instance_id, user_id, data)
        return instance
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/{instance_id}/pause",
    response_model=LabInstanceResponse,
    summary="Pause lab instance",
)
async def pause_lab_instance(
    instance_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(require_any_auth),
):
    """
    Pause a running lab instance.
    
    - Saves VM state
    - Preserves network configuration
    - Stops billing/charges for duration
    - Can be resumed later
    """
    service = LabInstanceService(db)
    user_id = UUID(current_user["sub"])
    
    try:
        from app.schemas.LabInstance import LabInstanceUpdate
        update_data = LabInstanceUpdate(status=LabInstanceStatus.PAUSED)
        instance = await service.update_instance(instance_id, user_id, update_data)
        return instance
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/{instance_id}/resume",
    response_model=LabInstanceResponse,
    summary="Resume lab instance",
)
async def resume_lab_instance(
    instance_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(require_any_auth),
):
    """
    Resume a paused lab instance.
    
    - Restores VM state
    - Resumes billing
    - Updates last_activity timestamp
    """
    service = LabInstanceService(db)
    user_id = UUID(current_user["sub"])
    
    try:
        from app.schemas.LabInstance import LabInstanceUpdate
        update_data = LabInstanceUpdate(status=LabInstanceStatus.RUNNING)
        instance = await service.update_instance(instance_id, user_id, update_data)
        return instance
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/{instance_id}/stop",
    response_model=LabInstanceResponse,
    summary="Stop lab instance",
)
async def stop_lab_instance(
    instance_id: UUID,
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(require_any_auth),
):
    """
    Stop a lab instance (user initiated).
    
    - Gracefully shuts down VMs
    - Releases resources
    - Sets status to STOPPING then COMPLETED
    - **Warning**: Cannot be resumed after stopping
    """
    service = LabInstanceService(db)
    user_id = UUID(current_user["sub"])
    
    try:
        instance = await service.stop_instance(instance_id, user_id, reason)
        return instance
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/{instance_id}/extend",
    response_model=LabInstanceResponse,
    summary="Extend lab instance time",
)
async def extend_lab_instance(
    instance_id: UUID,
    additional_minutes: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(require_any_auth),
):
    """
    Extend the expiry time of a lab instance.
    
    - Maximum 60 minutes per extension
    - Maximum 3 extensions per instance
    - Only for active (running/paused) instances
    - Updates expires_at timestamp
    """
    service = LabInstanceService(db)
    user_id = UUID(current_user["sub"])
    
    try:
        instance = await service.extend_instance(instance_id, user_id, additional_minutes)
        return instance
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/{instance_id}/force-stop",
    response_model=LabInstanceResponse,
    summary="Force stop lab instance (Admin/Moderator)",
)
async def force_stop_lab_instance(
    instance_id: UUID,
    reason: str = "Administrative action",
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(require_admin_or_moderator),
):
    """
    Force stop any lab instance (Admin/Moderator only).
    
    - Can stop any instance regardless of owner
    - Use for policy violations or resource reclamation
    - Logs administrative action
    """
    service = LabInstanceService(db)
    
    # Get instance without user filter (admin can stop any)
    instance = await service.get_instance(instance_id, user_id=None)
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lab instance not found"
        )
    
    # Mark as admin-stopped
    instance.terminated_by = "admin"
    instance.termination_reason = reason
    await db.commit()
    
    # Stop using admin override
    try:
        instance = await service.stop_instance(
            instance_id, 
            user_id=UUID(current_user["sub"]),
            reason=f"[ADMIN] {reason}"
        )
        return instance
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
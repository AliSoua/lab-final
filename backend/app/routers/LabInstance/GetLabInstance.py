# app/routers/LabInstance/GetLabInstance.py
"""
Lab Instance Get Router
=======================

Retrieve single lab instance details.

ENDPOINTS:
- GET /lab-instances/{instance_id} - Get instance details
- GET /lab-instances/{instance_id}/events - Get instance audit log
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from app.config.connection.postgres_client import get_async_db
from app.schemas.LabInstance import LabInstanceResponse, LabInstanceEventResponse, LabInstanceEventQuery
from app.services.LabInstance import LabInstanceService
from app.dependencies.keycloak.keycloak_roles import require_any_role

router = APIRouter()

require_any_auth = require_any_role(["trainee", "moderator", "admin"])
require_admin_or_moderator = require_any_role(["admin", "moderator"])


@router.get(
    "/{instance_id}",
    response_model=LabInstanceResponse,
    summary="Get lab instance details",
)
async def get_lab_instance(
    instance_id: UUID,
    include_vms: bool = Query(True, description="Include VM details"),
    include_events: bool = Query(False, description="Include recent events"),
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(require_any_auth),
):
    """
    Get detailed information about a specific lab instance.
    
    - Returns full instance details including status, progress, timing
    - Optionally includes VM details (access URLs, IPs, etc.)
    - Optionally includes recent audit events
    - Users can only access their own instances (unless admin/moderator)
    """
    service = LabInstanceService(db)
    user_id = UUID(current_user["sub"])
    user_role = current_user.get("role", "trainee")
    
    # Admin/moderator can view any instance, regular users only their own
    if user_role in ["admin", "moderator"]:
        instance = await service.get_instance(
            instance_id, 
            user_id=None,  # Don\'t filter by user
            load_relations=include_vms or include_events
        )
    else:
        instance = await service.get_instance(
            instance_id,
            user_id=user_id,
            load_relations=include_vms or include_events
        )
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lab instance not found"
        )
    
    return instance


@router.get(
    "/{instance_id}/events",
    response_model=List[LabInstanceEventResponse],
    summary="Get instance event log",
)
async def get_instance_events(
    instance_id: UUID,
    severity: Optional[str] = Query(None, description="Filter by severity (debug, info, warning, error, critical)"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum events to return"),
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(require_any_auth),
):
    """
    Get audit event log for a lab instance.
    
    - Returns provisioning events, state changes, errors
    - Ordered by timestamp (newest first)
    - Supports filtering by severity level
    """
    from sqlalchemy import select, desc
    from app.models.LabInstance import LabInstanceEvent, LabInstance
    
    user_id = UUID(current_user["sub"])
    user_role = current_user.get("role", "trainee")
    
    # Verify instance exists and user has access
    if user_role not in ["admin", "moderator"]:
        instance_check = await db.execute(
            select(LabInstance).where(
                and_(
                    LabInstance.id == instance_id,
                    LabInstance.user_id == user_id
                )
            )
        )
        if not instance_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lab instance not found"
            )
    
    # Query events
    query = select(LabInstanceEvent).where(
        LabInstanceEvent.lab_instance_id == instance_id
    ).order_by(desc(LabInstanceEvent.timestamp))
    
    if severity:
        query = query.where(LabInstanceEvent.severity == severity)
    
    query = query.limit(limit)
    
    result = await db.execute(query)
    events = result.scalars().all()
    
    return events


@router.get(
    "/{instance_id}/access",
    response_model=dict,
    summary="Get instance access URLs",
)
async def get_instance_access(
    instance_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(require_any_auth),
):
    """
    Get access URLs for a running lab instance.
    
    - Returns VNC, Guacamole, SSH gateway URLs
    - Returns VM-specific console URLs
    - Only available for RUNNING or PAUSED instances
    """
    service = LabInstanceService(db)
    user_id = UUID(current_user["sub"])
    
    instance = await service.get_instance(instance_id, user_id, load_relations=True)
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lab instance not found"
        )
    
    if not instance.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Instance is not active (status: {instance.status})"
        )
    
    return {
        "instance_id": str(instance_id),
        "status": instance.status,
        "access_urls": instance.access_urls,
        "credentials": instance.credentials,
        "vms": [
            {
                "id": str(vm.id),
                "name": vm.name,
                "ip_address": str(vm.ip_address) if vm.ip_address else None,
                "console_url": vm.console_url,
                "ssh_host": vm.ssh_host,
                "ssh_port": vm.ssh_port,
            }
            for vm in (instance.vms or [])
        ]
    }
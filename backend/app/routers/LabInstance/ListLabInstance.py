# app/routers/LabInstance/ListLabInstance.py
"""
Lab Instance List Router
========================

List lab instances with filtering and pagination.

USER ENDPOINTS:
- GET /lab-instances/ - List my instances (with filtering)

ADMIN ENDPOINTS:
- GET /lab-instances/all - List all instances system-wide
- GET /lab-instances/active - List all currently active instances
"""

from fastapi import APIRouter, Depends, Response, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from app.config.connection.postgres_client import get_async_db
from app.schemas.LabInstance import LabInstanceResponse, LabInstanceSummary, LabInstanceListParams, LabInstanceStatus
from app.services.LabInstance import LabInstanceService
from app.dependencies.keycloak.keycloak_roles import require_any_role

router = APIRouter()

require_admin_or_moderator = require_any_role(["admin", "moderator"])
require_any_auth = require_any_role(["trainee", "moderator", "admin"])


@router.get(
    "/",
    response_model=List[LabInstanceSummary],
    summary="List my lab instances",
)
async def list_my_instances(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum records to return"),
    status: Optional[LabInstanceStatus] = Query(None, description="Filter by status"),
    is_active: Optional[bool] = Query(None, description="Filter active instances only"),
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(require_any_auth),
    response: Response = None
):
    """
    List lab instances for the currently authenticated user.
    
    - Returns summary data for dashboard listing
    - Supports filtering by status (running, paused, completed, etc.)
    - Supports filtering by active state
    - Includes pagination with X-Total-Count header
    """
    user_id = UUID(current_user["sub"])
    
    service = LabInstanceService(db)
    
    params = LabInstanceListParams(
        status=status,
        is_active=is_active,
        page=(skip // limit) + 1,
        page_size=limit
    )
    
    instances, total = await service.list_instances(user_id, params)
    
    # Add total count header for frontend pagination
    if response:
        response.headers["X-Total-Count"] = str(total)
        response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"
    
    return instances


@router.get(
    "/active",
    response_model=List[LabInstanceSummary],
    summary="Get currently active instances (Trainees)",
)
async def get_active_instances(
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(require_any_auth),
):
    """
    Get all currently active (running or paused) instances for the user.
    
    Convenience endpoint for dashboard "My Active Labs" section.
    """
    user_id = UUID(current_user["sub"])
    service = LabInstanceService(db)
    
    params = LabInstanceListParams(
        is_active=True,
        page=1,
        page_size=10
    )
    
    instances, _ = await service.list_instances(user_id, params)
    return instances


@router.get(
    "/all",
    response_model=List[LabInstanceSummary],
    summary="List all lab instances (Admin/Moderator only)",
)
async def list_all_instances(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[LabInstanceStatus] = Query(None),
    user_id: Optional[UUID] = Query(None, description="Filter by specific user"),
    lab_definition_id: Optional[UUID] = Query(None, description="Filter by lab definition"),
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(require_admin_or_moderator),
    response: Response = None
):
    """
    List all lab instances system-wide (Admin/Moderator only).
    
    - **Admin**: sees all instances
    - **Moderator**: sees instances for labs they manage
    - Supports filtering by user, lab definition, status
    """
    # For now, implement basic query - can add moderator filtering later
    from app.models.LabInstance import LabInstance
    
    query = select(LabInstance)
    
    if status:
        query = query.where(LabInstance.status == status)
    if user_id:
        query = query.where(LabInstance.user_id == user_id)
    if lab_definition_id:
        query = query.where(LabInstance.lab_definition_id == lab_definition_id)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()
    
    # Apply pagination
    query = query.offset(skip).limit(limit).order_by(LabInstance.created_at.desc())
    
    result = await db.execute(query)
    instances = result.scalars().all()
    
    if response:
        response.headers["X-Total-Count"] = str(total)
        response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"
    
    return instances


@router.get(
    "/system/active-count",
    response_model=dict,
    summary="Get count of active instances (Admin/Moderator)",
)
async def get_system_active_count(
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(require_admin_or_moderator),
):
    """
    Get count of currently active instances system-wide.
    
    Returns counts by status for monitoring dashboard.
    """
    from app.models.LabInstance import LabInstance
    
    result = await db.execute(
        select(LabInstance.status, func.count(LabInstance.id))
        .group_by(LabInstance.status)
    )
    
    counts = {status.value: 0 for status in LabInstanceStatus}
    for status, count in result.all():
        counts[status] = count
    
    return {
        "total_active": counts.get("running", 0) + counts.get("paused", 0),
        "running": counts.get("running", 0),
        "paused": counts.get("paused", 0),
        "provisioning": counts.get("provisioning", 0),
        "by_status": counts
    }
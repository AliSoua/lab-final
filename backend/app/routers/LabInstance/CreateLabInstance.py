# app/routers/LabInstance/CreateLabInstance.py
"""
Lab Instance Creation Router
============================

Create new lab instances from lab definitions.

ENDPOINTS:
- POST /lab-instances/ - Create new instance
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select   
from uuid import UUID, uuid4

from app.config.connection.postgres_client import get_async_db
from app.schemas.LabInstance import LabInstanceCreate, LabInstanceResponse
from app.services.LabInstance import LabInstanceService
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.models.user import User

router = APIRouter()

require_any_auth = require_any_role(["trainee", "moderator", "admin"])


def _extract_role(current_user: dict) -> str:
    """Extract primary role from Keycloak token."""
    roles = current_user.get("realm_access", {}).get("roles", [])
    
    if "admin" in roles:
        return "admin"
    elif "moderator" in roles:
        return "moderator"
    else:
        return "trainee"


@router.post(
    "/",
    response_model=LabInstanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new lab instance",
)
async def create_lab_instance(
    data: LabInstanceCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(require_any_auth),
):
    """
    Create a new lab instance from a lab definition.
    
    - Validates the lab definition exists and is published
    - Checks user hasn't exceeded concurrent instance limits
    - Checks user doesn't already have active instance of this lab
    - Creates instance in SCHEDULED status (provisioning starts automatically)
    - Returns instance details with initial status
    
    **Triggers**: Background provisioning task will start automatically
    """
    # Extract Keycloak info
    keycloak_id = current_user.get("sub")
    email = current_user.get("email")
    username = current_user.get("preferred_username", email)
    
    if not keycloak_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token: missing required claims"
        )
    
    # Get or create local user (sync from Keycloak)
    result = await db.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    local_user = result.scalar_one_or_none()
    
    if not local_user:
        # First time - create local user from Keycloak
        local_user = User(
            id=uuid4(),
            keycloak_id=keycloak_id,
            email=email,
            username=username,
            first_name=current_user.get("given_name"),
            last_name=current_user.get("family_name"),
            role=_extract_role(current_user),
            is_active=True
        )
        db.add(local_user)
        await db.flush()  # Get the ID without committing transaction
    
    # Use LOCAL user ID (not Keycloak ID) for the instance
    local_user_id = local_user.id
    
    # Now create the lab instance
    service = LabInstanceService(db)
    
    try:
        # Create the instance with local user ID
        instance = await service.create_instance(local_user_id, data)
        
        # Start provisioning automatically
        await service.start_instance(instance.id, local_user_id)
        
        # Reload to get updated status
        instance = await service.get_instance(instance.id, local_user_id, load_relations=True)
        
        return instance
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create instance: {str(e)}"
        )
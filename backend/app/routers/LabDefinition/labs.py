# app/routers/LabDefinition/labs.py

from fastapi import APIRouter, Depends, HTTPException, status, Security
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel

# Keycloak dependencies
from app.dependencies.keycloak.keycloak_roles import (
    security, 
    get_jwks_client,
)
from app.config.connection.keycloak_client import KEYCLOAK_SERVER, KEYCLOAK_REALM
import jwt as pyjwt
from jwt import ExpiredSignatureError, InvalidTokenError

# Database
from app.config.connection.postgres_client import get_db

# Services
from app.services.LabDefinition.lab_service import LabService
from app.services.LabDefinition.lab_vm_service import LabVMService

# Schemas
from app.schemas.LabDefinition.core import LabDefinitionCreate, LabDefinitionUpdate, LabDefinitionResponse
from app.schemas.LabDefinition.LabVM import LabVMCreate, LabVMUpdate, LabVMResponse

# Models
from app.models.LabDefinition.core import LabDefinition
from app.models.LabDefinition.LabVM import LabVM

router = APIRouter(
    prefix="/lab-definitions",
    tags=["lab-definitions"],
    responses={404: {"description": "Not found"}}
)

# Service instances
lab_service = LabService()
vm_service = LabVMService()


# =============================================================================
# Role Dependencies & Ownership Helpers
# =============================================================================

def require_admin_or_moderator():
    """
    Dependency factory that validates JWT and checks for 'admin' OR 'moderator' role.
    Returns the decoded user payload if authorized.
    """
    def checker(credentials: HTTPAuthorizationCredentials = Depends(security)):
        if not credentials or credentials.scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token = credentials.credentials
        
        try:
            # Validate token locally using JWKS
            jwks_client = get_jwks_client()
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            
            payload = pyjwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience="account",
                issuer=f"{KEYCLOAK_SERVER}/realms/{KEYCLOAK_REALM}"
            )
            
            realm_access = payload.get("realm_access", {})
            roles = realm_access.get("roles", []) if isinstance(realm_access, dict) else []
            
            # Check for required roles
            if "admin" not in roles and "moderator" not in roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: requires 'admin' or 'moderator' role"
                )
            
            return {
                "sub": payload.get("sub"),
                "preferred_username": payload.get("preferred_username"),
                "email": payload.get("email"),
                "realm_access": realm_access,
                "roles": roles
            }
            
        except ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication failed: {str(e)}"
            )
    
    return checker


def check_lab_ownership(lab: LabDefinition, current_user: dict):
    """
    Check if the current user can access/modify the lab.
    
    Rules:
    - Admin: full access to all labs
    - Moderator: only access to labs they created (created_by == user.sub)
    """
    user_roles = current_user.get("roles", [])
    user_sub = current_user.get("sub")
    
    # Admin can access everything
    if "admin" in user_roles:
        return True
    
    # Moderator can only access their own labs
    if "moderator" in user_roles:
        if str(lab.created_by) != str(user_sub):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only manage lab definitions you created"
            )
        return True
    
    # Should not reach here if require_admin_or_moderator is used
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied: Insufficient permissions"
    )


def filter_labs_by_ownership(query, current_user: dict):
    """
    Filter labs query based on user role.
    
    - Admin: sees all labs
    - Moderator: sees only their own labs
    """
    user_roles = current_user.get("roles", [])
    user_sub = current_user.get("sub")
    
    # Admin sees all labs - no filter applied
    if "admin" in user_roles:
        return query
    
    # Moderator sees only their own labs
    if "moderator" in user_roles:
        return query.filter(LabDefinition.created_by == user_sub)
    
    # Fallback - should not happen if proper auth is enforced
    return query.filter(LabDefinition.created_by == user_sub)


# =============================================================================
# Schemas for Full Lab Creation
# =============================================================================

class LabVMItemCreate(BaseModel):
    """VM configuration within a full lab creation request"""
    name: str
    description: str | None = None
    vm_template_id: UUID
    cpu_cores: int | None = 2
    memory_mb: int | None = 4096
    disk_gb: int | None = 50
    network_config: dict | None = None
    startup_delay: int | None = 0
    order: int | None = None


class FullLabDefinitionCreate(BaseModel):
    """Complete lab definition creation payload."""
    name: str
    slug: str
    description: str | None = None
    category: str | None = None
    difficulty: str | None = None
    estimated_duration_minutes: int | None = None
    guide_content: str | None = None
    objectives: List[str] | None = None
    prerequisites: List[str] | None = None
    network_profile_id: UUID | None = None
    tags: List[str] | None = []
    vms: List[LabVMItemCreate] = []


class FullLabDefinitionResponse(BaseModel):
    """Response after creating full lab definition"""
    id: UUID
    name: str
    slug: str
    description: str | None
    category: str | None
    difficulty: str | None
    status: str
    vms: List[LabVMResponse]
    created_at: datetime
    created_by: str | None
    
    class Config:
        from_attributes = True


# =============================================================================
# API Endpoints
# =============================================================================

@router.post(
    "/full",
    response_model=FullLabDefinitionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create complete lab definition with VMs",
)
def create_full_lab_definition(
    data: FullLabDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator())
):
    """Atomic creation of LabDefinition + LabVMs."""
    try:
        lab = LabDefinition(
            name=data.name,
            slug=data.slug,
            description=data.description,
            category=data.category,
            difficulty=data.difficulty,
            estimated_duration_minutes=data.estimated_duration_minutes,
            guide_content=data.guide_content,
            objectives=data.objectives,
            prerequisites=data.prerequisites,
            network_profile_id=data.network_profile_id,
            tags=data.tags,
            created_by=current_user["sub"],
            status="draft"
        )
        
        db.add(lab)
        db.flush()
        
        created_vms = []
        for idx, vm_data in enumerate(data.vms):
            vm = LabVM(
                lab_id=lab.id,
                name=vm_data.name,
                description=vm_data.description,
                vm_template_id=vm_data.vm_template_id,
                cpu_cores=vm_data.cpu_cores or 2,
                memory_mb=vm_data.memory_mb or 4096,
                disk_gb=vm_data.disk_gb or 50,
                network_config=vm_data.network_config,
                startup_delay=vm_data.startup_delay or 0,
                order=vm_data.order if vm_data.order is not None else idx
            )
            db.add(vm)
            created_vms.append(vm)
        
        db.commit()
        db.refresh(lab)
        for vm in created_vms:
            db.refresh(vm)
        
        lab.vms = created_vms
        return lab
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create lab definition: {str(e)}"
        )


@router.post(
    "/",
    response_model=LabDefinitionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create basic lab definition (no VMs)",
)
def create_lab_definition(
    data: LabDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator())
):
    """Create a lab definition shell without VMs."""
    creation_data = data.model_dump()
    creation_data["created_by"] = current_user["sub"]
    
    lab = lab_service.create_lab(db, creation_data)
    return lab


@router.get(
    "/",
    response_model=List[LabDefinitionResponse],
    summary="List lab definitions",
)
def list_lab_definitions(
    skip: int = 0,
    limit: int = 100,
    category: str | None = None,
    difficulty: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator())
):
    """
    List labs with filtering options.
    
    - **Admin**: sees all lab definitions
    - **Moderator**: sees only lab definitions they created
    """
    query = db.query(LabDefinition)
    
    # Apply role-based filtering
    query = filter_labs_by_ownership(query, current_user)
    
    if category:
        query = query.filter(LabDefinition.category == category)
    if difficulty:
        query = query.filter(LabDefinition.difficulty == difficulty)
    if status:
        query = query.filter(LabDefinition.status == status)
    
    return query.offset(skip).limit(limit).all()


@router.get(
    "/{lab_id}",
    response_model=FullLabDefinitionResponse,
    summary="Get lab definition with VMs"
)
def get_lab_definition(
    lab_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator())
):
    """
    Get complete lab definition including all VM configurations.
    
    - **Admin**: can access any lab
    - **Moderator**: can only access labs they created
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    # Check ownership permissions
    check_lab_ownership(lab, current_user)
    
    vms = vm_service.get_by_lab(db, lab_id)
    lab.vms = vms
    
    return lab


@router.get(
    "/slug/{slug}",
    response_model=FullLabDefinitionResponse,
    summary="Get lab by slug"
)
def get_lab_by_slug(
    slug: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator())
):
    """
    Retrieve lab definition by its URL-friendly slug.
    
    - **Admin**: can access any lab
    - **Moderator**: can only access labs they created
    """
    lab = lab_service.get_by_slug(db, slug)
    if not lab:
        raise HTTPException(404, f"Lab with slug '{slug}' not found")
    
    # Check ownership permissions
    check_lab_ownership(lab, current_user)
    
    lab.vms = vm_service.get_by_lab(db, lab.id)
    return lab


@router.put(
    "/{lab_id}",
    response_model=LabDefinitionResponse,
    summary="Update lab metadata",
)
def update_lab_definition(
    lab_id: UUID,
    data: LabDefinitionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator())
):
    """
    Update lab definition fields. Does not modify VMs.
    
    - **Admin**: can update any lab
    - **Moderator**: can only update labs they created
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    # Check ownership permissions
    check_lab_ownership(lab, current_user)
    
    # Inject updated_by with current user
    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_by"] = current_user["sub"]
    
    return lab_service.update_lab(db, lab, LabDefinitionUpdate(**update_data))


@router.delete(
    "/{lab_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete lab definition",
)
def delete_lab_definition(
    lab_id: UUID,
    force: bool = False,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator())
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
    
    # Check ownership permissions
    check_lab_ownership(lab, current_user)
    
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


# =============================================================================
# VM Management Endpoints (Nested Resource) - With Ownership Checks
# =============================================================================

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
    current_user: dict = Depends(require_admin_or_moderator())
):
    """
    Add a VM configuration to an existing lab definition.
    
    - **Admin**: can add VMs to any lab
    - **Moderator**: can only add VMs to labs they created
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    # Check ownership permissions
    check_lab_ownership(lab, current_user)
    
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
    current_user: dict = Depends(require_admin_or_moderator())
):
    """
    Get all VM configurations for a specific lab.
    
    - **Admin**: can view VMs of any lab
    - **Moderator**: can only view VMs of labs they created
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    # Check ownership permissions
    check_lab_ownership(lab, current_user)
    
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
    current_user: dict = Depends(require_admin_or_moderator())
):
    """
    Update a specific VM within a lab.
    
    - **Admin**: can update VMs in any lab
    - **Moderator**: can only update VMs in labs they created
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    # Check ownership permissions
    check_lab_ownership(lab, current_user)
    
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
    current_user: dict = Depends(require_admin_or_moderator())
):
    """
    Remove a VM configuration from a lab.
    
    - **Admin**: can delete VMs from any lab
    - **Moderator**: can only delete VMs from labs they created
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab definition not found")
    
    # Check ownership permissions
    check_lab_ownership(lab, current_user)
    
    vm = vm_service.get(db, vm_id)
    if not vm or str(vm.lab_id) != str(lab_id):
        raise HTTPException(404, "VM not found in this lab")
    
    vm_service.delete(db, vm)
    return None


@router.post(
    "/{lab_id}/publish",
    response_model=LabDefinitionResponse,
    summary="Publish lab (change status to published)",
)
def publish_lab(
    lab_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator())
):
    """
    Change lab status from draft to published.
    
    - **Admin**: can publish any lab
    - **Moderator**: can only publish labs they created
    """
    lab = lab_service.get_lab(db, lab_id)
    if not lab:
        raise HTTPException(404, "Lab not found")
    
    # Check ownership permissions
    check_lab_ownership(lab, current_user)
    
    from app.schemas.LabDefinition.core import LabDefinitionUpdate
    update_data = LabDefinitionUpdate(
        status="published",
        updated_by=current_user["sub"]
    )
    return lab_service.update_lab(db, lab, update_data)
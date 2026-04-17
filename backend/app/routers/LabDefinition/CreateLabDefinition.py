# app/routers/LabDefinition/CreateLabDefinition.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List
import json
import uuid

from app.config.connection.postgres_client import get_db
from app.services.LabDefinition.lab_service import LabService
from app.services.LabDefinition.lab_vm_service import LabVMService
from app.services.LabDefinition.lab_guide_service import LabGuideService
from app.services.file_upload_service import file_upload_service
from app.schemas.LabDefinition.core import LabDefinitionCreate, LabDefinitionResponse, LabDifficulty, LabCategory
from app.schemas.LabDefinition.LabGuideBlock import LabGuideBlockCreate  # ADD THIS IMPORT
from app.models.LabDefinition.core import LabDefinition
from app.models.LabDefinition.LabVM import LabVM
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.schemas.LabDefinition.full_lab import (
    FullLabDefinitionCreate, 
    FullLabDefinitionResponse,
    LabVMItemCreate
)

router = APIRouter()
require_admin_or_moderator = require_any_role(["admin", "moderator"])
lab_service = LabService()
vm_service = LabVMService()
guide_service = LabGuideService()


# ==============================================================================
# BASIC LAB DEFINITION ENDPOINTS (No VMs)
# ==============================================================================

@router.post(
    "/",
    response_model=LabDefinitionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create basic lab definition (JSON only)",
)
def create_lab_definition(
    data: LabDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator),
):
    """
    Create a basic lab definition without VMs or thumbnail.
    
    - **Content-Type**: application/json
    - **Returns**: Created lab definition
    """
    creation_data = data.model_dump()
    creation_data["created_by"] = current_user["sub"]
    
    # Ensure arrays are never None
    creation_data["objectives"] = creation_data.get("objectives") or []
    creation_data["prerequisites"] = creation_data.get("prerequisites") or []
    creation_data["tags"] = creation_data.get("tags") or []
    
    lab = lab_service.create_lab(db, creation_data)
    return lab


@router.post(
    "/thumbnail",
    response_model=LabDefinitionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create lab definition with thumbnail upload",
)
async def create_lab_definition_with_thumbnail(
    name: str = Form(..., max_length=255),
    slug: str = Form(..., max_length=255),
    description: str = Form(...),
    short_description: Optional[str] = Form(None, max_length=500),
    duration_minutes: int = Form(60),
    max_concurrent_users: int = Form(1),
    cooldown_minutes: int = Form(0),
    difficulty: str = Form("beginner"),
    category: str = Form("other"),
    track: Optional[str] = Form(None, max_length=100),
    objectives: Optional[str] = Form("[]"),
    prerequisites: Optional[str] = Form("[]"),
    tags: Optional[str] = Form("[]"),
    thumbnail: UploadFile = File(...),  # Required for this endpoint
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator),
):
    """
    Create a lab definition with thumbnail image upload.
    
    - **Content-Type**: multipart/form-data
    - **objectives/prerequisites/tags**: JSON string arrays (e.g., '["learn sql"]')
    - **thumbnail**: Required image file (jpg, png, webp, max 5MB)
    """
    # Parse JSON strings
    try:
        objectives_list = json.loads(objectives) if objectives else []
        prerequisites_list = json.loads(prerequisites) if prerequisites else []
        tags_list = json.loads(tags) if tags else []
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON in array fields: {str(e)}")

    # Validate enums
    try:
        difficulty_enum = LabDifficulty(difficulty)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid difficulty: {difficulty}")
    
    try:
        category_enum = LabCategory(category)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")

    creation_data = {
        "slug": slug,
        "name": name,
        "description": description,
        "short_description": short_description,
        "status": "draft",
        "duration_minutes": duration_minutes,
        "max_concurrent_users": max_concurrent_users,
        "cooldown_minutes": cooldown_minutes,
        "difficulty": difficulty_enum,
        "category": category_enum,
        "track": track,
        "thumbnail_url": None,  # Will be set after upload
        "objectives": objectives_list,
        "prerequisites": prerequisites_list,
        "tags": tags_list,
        "created_by": current_user["sub"],
    }

    # Create lab first (without image)
    lab = lab_service.create_lab(db, creation_data)
    
    # Handle image upload
    try:
        image_url = await file_upload_service.save_lab_thumbnail(
            file=thumbnail,
            lab_id=lab.id
        )
        lab.thumbnail_url = image_url
        db.commit()
        db.refresh(lab)
    except HTTPException:
        # If image upload fails, delete the created lab and re-raise
        db.delete(lab)
        db.commit()
        raise
    
    return lab


# ==============================================================================
# FULL LAB DEFINITION ENDPOINTS (With VMs and Guide Blocks)
# ==============================================================================

@router.post(
    "/full",
    response_model=FullLabDefinitionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create complete lab with VMs and Guide (JSON only)",
)
def create_full_lab_definition(
    data: FullLabDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Atomic creation of LabDefinition + LabVMs + GuideBlocks via JSON.
    
    - **Content-Type**: application/json
    - VMs reference external ESXi/vCenter templates via vm_template_id
    """
    try:
        # Validate guide blocks before starting transaction
        guide_service.validate_guide(data.guide_blocks)
        
        # Create Lab Definition
        lab = LabDefinition(
            name=data.name,
            slug=data.slug,
            description=data.description,
            short_description=data.short_description,
            category=data.category,
            difficulty=data.difficulty,
            duration_minutes=data.duration_minutes,
            max_concurrent_users=data.max_concurrent_users or 1,
            cooldown_minutes=data.cooldown_minutes or 0,
            objectives=data.objectives or [],
            prerequisites=data.prerequisites or [],
            tags=data.tags or [],
            track=data.track,
            thumbnail_url=data.thumbnail_url,
            created_by=current_user["sub"],
            status=data.status or "draft",
            is_featured=data.is_featured or False,
            featured_priority=data.featured_priority or 0,
        )
        
        db.add(lab)
        db.flush()  # Get lab.id without committing
        
        # Create VMs
        created_vms = []
        for idx, vm_data in enumerate(data.vms):
            config = {
                "cpu_cores": vm_data.cpu_cores or 2,
                "memory_mb": vm_data.memory_mb or 4096,
                "disk_gb": vm_data.disk_gb or 50,
                "network_config": vm_data.network_config or {},
                "startup_delay": vm_data.startup_delay or 0,
                "description": vm_data.description,
            }
            
            vm = LabVM(
                lab_id=lab.id,
                name=vm_data.name,
                vm_template_id=str(vm_data.vm_template_id),
                order=vm_data.order if vm_data.order is not None else idx,
                config=config
            )
            db.add(vm)
            created_vms.append(vm)
        
        # Create Guide Blocks
        created_blocks = guide_service.create_many(db, lab.id, data.guide_blocks)
        
        db.commit()
        
        # Refresh all objects
        db.refresh(lab)
        for vm in created_vms:
            db.refresh(vm)
        for block in created_blocks:
            db.refresh(block)
        
        lab.vms = created_vms
        lab.guide_blocks = created_blocks
        
        return lab
        
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create lab definition: {str(e)}"
        )


@router.post(
    "/full/thumbnail",
    response_model=FullLabDefinitionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create complete lab with VMs, Guide, and thumbnail upload",
)
async def create_full_lab_definition_with_thumbnail(
    name: str = Form(..., max_length=255),
    slug: str = Form(..., max_length=255),
    description: str = Form(...),
    short_description: Optional[str] = Form(None, max_length=500),
    duration_minutes: int = Form(120),
    max_concurrent_users: int = Form(1),
    cooldown_minutes: int = Form(0),
    difficulty: str = Form("beginner"),
    category: str = Form("other"),
    track: Optional[str] = Form(None, max_length=100),
    objectives: Optional[str] = Form("[]"),
    prerequisites: Optional[str] = Form("[]"),
    tags: Optional[str] = Form("[]"),
    vms: str = Form(...),  # JSON array of LabVMItemCreate
    guide_blocks: str = Form(...),  # JSON array of LabGuideBlockCreate
    thumbnail: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Atomic creation of LabDefinition + LabVMs + GuideBlocks with thumbnail upload.
    
    - **Content-Type**: multipart/form-data
    - **vms**: JSON string array of VM configurations
    - **guide_blocks**: JSON string array of guide content blocks
    - **thumbnail**: Required image file
    """
    try:
        # Parse JSON strings
        objectives_list = json.loads(objectives) if objectives else []
        prerequisites_list = json.loads(prerequisites) if prerequisites else []
        tags_list = json.loads(tags) if tags else []
        vms_list = json.loads(vms) if vms else []
        guide_blocks_raw = json.loads(guide_blocks) if guide_blocks else []
        
        # Convert guide blocks dicts to Pydantic models
        guide_blocks_list = [LabGuideBlockCreate(**block) for block in guide_blocks_raw]
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    except (TypeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid block data: {str(e)}")

    # Validate enums
    try:
        difficulty_enum = LabDifficulty(difficulty)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid difficulty: {difficulty}")
    
    try:
        category_enum = LabCategory(category)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")

    try:
        # Validate guide blocks (now they're Pydantic models)
        guide_service.validate_guide(guide_blocks_list)
        
        # CHECK FOR EXISTING SLUG BEFORE CREATING
        existing = db.query(LabDefinition).filter(LabDefinition.slug == slug).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Lab with slug '{slug}' already exists"
            )

        # Create Lab Definition
        lab = LabDefinition(
            name=name,
            slug=slug,
            description=description,
            short_description=short_description,
            category=category_enum.value,
            difficulty=difficulty_enum.value,
            duration_minutes=duration_minutes,
            max_concurrent_users=max_concurrent_users,
            cooldown_minutes=cooldown_minutes,
            objectives=objectives_list,
            prerequisites=prerequisites_list,
            tags=tags_list,
            track=track,
            thumbnail_url=None,  # Will set after upload
            created_by=current_user["sub"],
            status="draft",
            is_featured=False,  # Default for creation via form
            featured_priority=0,
        )
        
        db.add(lab)
        db.flush()  # Get lab.id
        
        # Create VMs
        created_vms = []
        for idx, vm_data in enumerate(vms_list):
            vm = LabVM(
                lab_id=lab.id,
                name=vm_data["name"],
                vm_template_id=str(vm_data["vm_template_id"]),
                order=vm_data.get("order", idx),
                config={
                    "cpu_cores": vm_data.get("cpu_cores", 2),
                    "memory_mb": vm_data.get("memory_mb", 4096),
                    "disk_gb": vm_data.get("disk_gb", 50),
                    "network_config": vm_data.get("network_config", {}),
                    "startup_delay": vm_data.get("startup_delay", 0),
                    "description": vm_data.get("description"),
                }
            )
            db.add(vm)
            created_vms.append(vm)
        
        # Create Guide Blocks
        created_blocks = guide_service.create_many(db, lab.id, guide_blocks_list)
        
        # Handle thumbnail upload
        image_url = await file_upload_service.save_lab_thumbnail(
            file=thumbnail,
            lab_id=lab.id
        )
        lab.thumbnail_url = image_url
        
        db.commit()
        
        # Refresh all
        db.refresh(lab)
        for vm in created_vms:
            db.refresh(vm)
        for block in created_blocks:
            db.refresh(block)
        
        lab.vms = created_vms
        lab.guide_blocks = created_blocks
        
        return lab
        
    except HTTPException:
        db.rollback()
        raise
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create lab definition: {str(e)}"
        )
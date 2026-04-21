# app/routers/LabDefinition/CreateLabDefinition.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List
import json
import uuid

from app.config.connection.postgres_client import get_db
from app.services.LabDefinition.lab_service import LabService
from app.services.LabDefinition.lab_vm_service import LabVMService
from app.services.file_upload_service import file_upload_service
from app.schemas.LabDefinition.core import LabDefinitionCreate, LabDefinitionResponse, LabDifficulty, LabCategory
from app.models.LabDefinition.core import LabDefinition
from app.models.LabDefinition.LabVM import LabVM
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.schemas.LabDefinition.full_lab import (
    FullLabDefinitionCreate, 
    FullLabDefinitionResponse,
)

router = APIRouter()
require_admin_or_moderator = require_any_role(["admin", "moderator"])
lab_service = LabService()
vm_service = LabVMService()


# ==============================================================================
# FULL LAB DEFINITION ENDPOINTS (With VMs + Guide assignment only)
# ==============================================================================

@router.post(
    "/full",
    response_model=FullLabDefinitionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create complete lab with VMs and existing Guide",
)
def create_full_lab_definition(
    data: FullLabDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Atomic creation of LabDefinition + LabVMs with an existing Guide.
    
    The guide must be created separately beforehand and linked by **guide_id**.
    """
    try:
        # Create Lab Definition
        lab = LabDefinition(
            name=data.name,
            slug=data.slug,
            description=data.description,
            short_description=data.short_description,
            category=data.category.value if data.category else None,
            difficulty=data.difficulty.value if data.difficulty else None,
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
            infrastructure_provider=data.infrastructure_provider.value if data.infrastructure_provider else "vsphere",
            guide_id=data.guide_id,
        )
        
        db.add(lab)
        db.flush()
        
        # Create VMs (clones from vCenter/ESXi source VMs)
        created_vms = []
        for idx, vm_data in enumerate(data.vms):
            vm = LabVM(
                lab_id=lab.id,
                source_vm_id=str(vm_data.source_vm_id),
                name=vm_data.name,
                snapshot_name=vm_data.snapshot_name,
                cpu_cores=vm_data.cpu_cores,
                memory_mb=vm_data.memory_mb,
                order=vm_data.order if vm_data.order is not None else idx,
            )
            db.add(vm)
            created_vms.append(vm)
        
        db.commit()
        
        db.refresh(lab)
        for vm in created_vms:
            db.refresh(vm)
        
        lab.vms = created_vms
        
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
    summary="Create complete lab with VMs, existing Guide, and thumbnail upload",
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
    vms: str = Form(...),
    guide_id: str = Form(...),
    thumbnail: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator)
):
    """
    Atomic creation of LabDefinition + LabVMs + existing Guide with thumbnail upload.
    
    - **vms**: JSON array of VM clone configs
    - **guide_id**: Required existing guide UUID (must be created separately)
    """
    try:
        objectives_list = json.loads(objectives) if objectives else []
        prerequisites_list = json.loads(prerequisites) if prerequisites else []
        tags_list = json.loads(tags) if tags else []
        vms_list = json.loads(vms) if vms else []
        guide_id_uuid = uuid.UUID(guide_id)
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid data format: {str(e)}")

    try:
        difficulty_enum = LabDifficulty(difficulty)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid difficulty: {difficulty}")
    
    try:
        category_enum = LabCategory(category)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")

    try:
        existing = db.query(LabDefinition).filter(LabDefinition.slug == slug).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Lab with slug '{slug}' already exists"
            )

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
            thumbnail_url=None,
            created_by=current_user["sub"],
            status="draft",
            is_featured=False,
            featured_priority=0,
            infrastructure_provider="vsphere",
            guide_id=guide_id_uuid,
        )
        
        db.add(lab)
        db.flush()
        
        # Create VMs
        created_vms = []
        for idx, vm_data in enumerate(vms_list):
            vm = LabVM(
                lab_id=lab.id,
                source_vm_id=str(vm_data["source_vm_id"]),
                name=vm_data["name"],
                snapshot_name=vm_data.get("snapshot_name"),
                cpu_cores=vm_data.get("cpu_cores"),
                memory_mb=vm_data.get("memory_mb"),
                order=vm_data.get("order", idx),
            )
            db.add(vm)
            created_vms.append(vm)
        
        # Handle thumbnail upload
        image_url = await file_upload_service.save_lab_thumbnail(
            file=thumbnail,
            lab_id=lab.id
        )
        lab.thumbnail_url = image_url
        
        db.commit()
        
        db.refresh(lab)
        for vm in created_vms:
            db.refresh(vm)
        
        lab.vms = created_vms
        
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
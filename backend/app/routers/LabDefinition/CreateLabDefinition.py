# app/routers/LabDefinition/CreateLabDefinition.py

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import ValidationError
from typing import Optional, List, Dict, Any, Union
import json
import uuid
import hvac
import logging

from app.config.connection.postgres_client import get_db
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.config.connection.vault_client import VaultClient
from app.dependencies.vault.vault_auth import require_vault_client
from app.services.LabDefinition.lab_service import LabService
from app.services.LabDefinition.lab_vm_service import LabVMService
from app.services.LabDefinition.LabConnection import (
    list_connections_grouped_by_slug,
)
from app.services.file_upload_service import file_upload_service
from app.schemas.LabDefinition.core import LabDefinitionCreate, LabDefinitionResponse, LabDifficulty, LabCategory
from app.schemas.LabDefinition.LabVM import LabVMCreate
from app.schemas.LabDefinition.LabConnection import LabConnectionSlot
from app.schemas.LabDefinition.full_lab import (
    FullLabDefinitionCreate,
    FullLabDefinitionResponse,
)
from app.models.LabDefinition.core import LabDefinition
from app.models.LabDefinition.LabVM import LabVM

logger = logging.getLogger(__name__)

router = APIRouter()
require_admin_or_moderator = require_any_role(["admin", "moderator"])
lab_service = LabService()
vm_service = LabVMService()


def _slot_to_dict(slot: Union[LabConnectionSlot, Dict[str, Any]]) -> Dict[str, Any]:
    """Normalize a LabConnectionSlot (model or dict) to a plain dict."""
    if isinstance(slot, dict):
        return slot
    if hasattr(slot, "model_dump"):
        return slot.model_dump()
    # Pydantic v1 fallback
    if hasattr(slot, "dict"):
        return slot.dict()
    raise ValueError(f"Unexpected slot type: {type(slot)}")


def _validate_connection_slots(
    db: Session,
    slots: List[Union[LabConnectionSlot, Dict[str, Any]]],
    vault_user_client: hvac.Client,
) -> List[Dict[str, Any]]:
    """Validate that requested connection slots exist in DB and are Vault-accessible."""
    if not slots:
        return []

    # Fetch all existing connections grouped by slug
    grouped = list_connections_grouped_by_slug(db, search=None)

    # Normalize grouped items to dicts (handles ORM objects, Pydantic models, or raw dicts)
    def _normalize_group(g: Any) -> Dict[str, Any]:
        if isinstance(g, dict):
            return g
        if hasattr(g, "model_dump"):
            return g.model_dump()
        if hasattr(g, "dict"):
            return g.dict()
        return {
            "slug": getattr(g, "slug"),
            "connections": getattr(g, "connections", []),
        }

    grouped_dicts = [_normalize_group(g) for g in grouped]
    slug_map = {g["slug"]: g for g in grouped_dicts}

    resolved: List[Dict[str, Any]] = []

    for slot in slots:
        slot_dict = _slot_to_dict(slot)
        slot_slug = slot_dict["slug"]

        if slot_slug not in slug_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Lab connection slug '{slot_slug}' not found",
            )

        group = slug_map[slot_slug]

        # Normalize nested connections and extract available protocols
        connections = group.get("connections", [])
        available_protocols: set[str] = set()
        for c in connections:
            if isinstance(c, dict):
                if proto := c.get("protocol"):
                    available_protocols.add(proto)
            else:
                if proto := getattr(c, "protocol", None):
                    available_protocols.add(proto)

        # Validate requested protocols exist for this slug
        requested: list[str] = []
        if slot_dict.get("ssh"):
            if "ssh" not in available_protocols:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"SSH not available for connection '{slot_slug}'",
                )
            requested.append("ssh")
        if slot_dict.get("rdp"):
            if "rdp" not in available_protocols:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"RDP not available for connection '{slot_slug}'",
                )
            requested.append("rdp")
        if slot_dict.get("vnc"):
            if "vnc" not in available_protocols:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"VNC not available for connection '{slot_slug}'",
                )
            requested.append("vnc")

        # Vault permission check: verify user can read these connection secrets
        vault_client = VaultClient()
        for protocol in requested:
            vault_path = f"credentials/lab_connections/{slot_slug}/{protocol}"
            try:
                vault_client.read_metadata(vault_path, vault_user_client)
            except PermissionError:
                logger.warning(
                    "User denied Vault access to %s (protocol=%s)", slot_slug, protocol
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied to connection '{slot_slug}/{protocol}'",
                )
            except FileNotFoundError:
                logger.error(
                    "Connection metadata missing in Vault: %s/%s", slot_slug, protocol
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Connection '{slot_slug}/{protocol}' is not fully configured",
                )
            except Exception as e:
                logger.error(
                    "Vault check failed for %s/%s: %s", slot_slug, protocol, e
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to validate connection '{slot_slug}/{protocol}'",
                )

        resolved.append({
            "slug": slot_slug,
            "ssh": slot_dict.get("ssh", False),
            "rdp": slot_dict.get("rdp", False),
            "vnc": slot_dict.get("vnc", False),
        })

    return resolved


def _build_esxi_vault_path(moderator_id: str, esxi_host: str) -> str:
    """Construct the Vault path for moderator ESXi credentials."""
    return f"credentials/moderators/{moderator_id}/{esxi_host}"


# ==============================================================================
# FULL LAB DEFINITION ENDPOINTS (With VMs + Connection Slots + Guide)
# ==============================================================================

@router.post(
    "/full",
    response_model=FullLabDefinitionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create complete lab with VMs, Connection Slots and existing Guide",
)
def create_full_lab_definition(
    data: FullLabDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator),
    vault_user_client: hvac.Client = Depends(require_vault_client),
):
    """
    Atomic creation of LabDefinition + LabVMs + ConnectionSlot references with an existing Guide.
    
    Connections are NOT created here — they must already exist. Only the slot
    assignments (slug + enabled protocols) are stored on the lab definition.
    """
    moderator_id = current_user["sub"]
    
    try:
        # Reject duplicate slug early with a clean message (race still covered by IntegrityError below)
        if db.query(LabDefinition).filter(LabDefinition.slug == data.slug).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A lab with slug '{data.slug}' already exists",
            )

        # Validate and resolve connection slots (DB + Vault check)
        connection_slots = _validate_connection_slots(
            db, data.connections, vault_user_client
        )

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
            created_by=moderator_id,
            status=data.status or "draft",
            is_featured=data.is_featured or False,
            featured_priority=data.featured_priority or 0,
            infrastructure_provider=data.infrastructure_provider.value if data.infrastructure_provider else "vsphere",
            guide_version_id=data.guide_version_id,
            connection_slots=connection_slots,
        )
        
        db.add(lab)
        db.flush()
        
        # Create VMs with ESXi vault path resolved from moderator ID
        created_vms = []
        for idx, vm_data in enumerate(data.vms):
            esxi_vault_path = None
            if vm_data.esxi_host:
                esxi_vault_path = _build_esxi_vault_path(moderator_id, vm_data.esxi_host)
            
            vm = LabVM(
                lab_id=lab.id,
                source_vm_id=str(vm_data.source_vm_id),
                name=vm_data.name,
                snapshot_name=vm_data.snapshot_name,
                esxi_vault_path=esxi_vault_path,
                esxi_host=vm_data.esxi_host,
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
        
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError as e:
        db.rollback()
        logger.warning("IntegrityError creating lab '%s': %s", data.slug, e.orig)
        orig = str(e.orig).lower() if e.orig is not None else ""
        if "slug" in orig or "ix_lab_definitions_slug" in orig:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A lab with slug '{data.slug}' already exists",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database constraint violated while creating the lab",
        )
    except ValueError:
        db.rollback()
        logger.exception("ValueError creating lab '%s'", data.slug)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid input data",
        )
    except Exception:
        db.rollback()
        logger.exception("Unexpected error creating lab '%s'", data.slug)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create lab definition",
        )


@router.post(
    "/full/thumbnail",
    response_model=FullLabDefinitionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create complete lab with VMs, Connection Slots, existing Guide, and thumbnail upload",
)
async def create_full_lab_definition_with_thumbnail(
    name: str = Form(...),
    slug: str = Form(...),
    description: Optional[str] = Form(None),
    short_description: Optional[str] = Form(None),
    duration_minutes: int = Form(120),
    max_concurrent_users: int = Form(1),
    cooldown_minutes: int = Form(0),
    difficulty: str = Form("beginner"),
    category: str = Form("other"),
    track: Optional[str] = Form(None),
    objectives: Optional[str] = Form(None),
    prerequisites: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    vms: Optional[str] = Form(None),
    connections: Optional[str] = Form(None),
    guide_version_id: Optional[str] = Form(None),
    thumbnail: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_moderator),
    vault_user_client: hvac.Client = Depends(require_vault_client),
):
    """
    Atomic creation of LabDefinition + LabVMs + ConnectionSlot references + existing Guide
    from a `multipart/form-data` request that includes a thumbnail file upload.

    JSON-encoded form fields:
    - **objectives / prerequisites / tags**: JSON array of strings
    - **vms**: JSON array of LabVMCreate objects
    - **connections**: JSON array of LabConnectionSlot objects (slug + protocol flags)
    - **guide_version_id**: Optional existing guide UUID (must be created separately)
    """
    moderator_id = current_user["sub"]

    def _parse_json_field(field_name: str, raw: Optional[str]):
        if not raw:
            return []
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Field '{field_name}' is not valid JSON",
            )

    objectives_list = _parse_json_field("objectives", objectives)
    prerequisites_list = _parse_json_field("prerequisites", prerequisites)
    tags_list = _parse_json_field("tags", tags)
    vms_list = _parse_json_field("vms", vms)
    connections_list = _parse_json_field("connections", connections)

    try:
        guide_version_id_uuid = uuid.UUID(guide_version_id) if guide_version_id else None
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'guide_version_id' must be a valid UUID",
        )

    try:
        difficulty_enum = LabDifficulty(difficulty)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Field 'difficulty' has an invalid value: '{difficulty}'",
        )

    try:
        category_enum = LabCategory(category)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Field 'category' has an invalid value: '{category}'",
        )

    # Validate nested Pydantic models with precise field targeting
    try:
        vms_validated = [LabVMCreate(**vm) for vm in vms_list]
        connections_validated = [LabConnectionSlot(**c) for c in connections_list]
    except ValidationError as e:
        first = e.errors()[0] if e.errors() else {"loc": ("unknown",), "msg": "invalid"}
        field_path = ".".join(str(p) for p in first.get("loc", ()))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid '{field_path}': {first.get('msg', 'invalid value')}",
        )

    # Validate connection slots against DB + Vault
    try:
        connection_slots = _validate_connection_slots(
            db, connections_validated, vault_user_client
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Connection validation failed for lab '%s'", slug)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Connection validation failed",
        )

    try:
        if db.query(LabDefinition).filter(LabDefinition.slug == slug).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A lab with slug '{slug}' already exists",
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
            created_by=moderator_id,
            status="draft",
            is_featured=False,
            featured_priority=0,
            infrastructure_provider="vsphere",
            guide_version_id=guide_version_id_uuid,
            connection_slots=connection_slots,
        )

        db.add(lab)
        db.flush()

        # Create VMs with ESXi vault path resolved from moderator ID
        created_vms = []
        for idx, vm_data in enumerate(vms_validated):
            esxi_vault_path = None
            if vm_data.esxi_host:
                esxi_vault_path = _build_esxi_vault_path(moderator_id, vm_data.esxi_host)
            
            vm = LabVM(
                lab_id=lab.id,
                source_vm_id=str(vm_data.source_vm_id),
                name=vm_data.name,
                snapshot_name=vm_data.snapshot_name,
                esxi_vault_path=esxi_vault_path,
                esxi_host=vm_data.esxi_host,
                cpu_cores=vm_data.cpu_cores,
                memory_mb=vm_data.memory_mb,
                order=vm_data.order if vm_data.order is not None else idx,
            )
            db.add(vm)
            created_vms.append(vm)

        # Handle thumbnail upload (after DB flush so we have lab.id)
        image_url = await file_upload_service.save_lab_thumbnail(
            file=thumbnail,
            lab_id=lab.id,
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
    except IntegrityError as e:
        db.rollback()
        logger.warning("IntegrityError creating lab '%s': %s", slug, e.orig)
        orig = str(e.orig).lower() if e.orig is not None else ""
        if "slug" in orig or "ix_lab_definitions_slug" in orig:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A lab with slug '{slug}' already exists",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database constraint violated while creating the lab",
        )
    except ValueError:
        db.rollback()
        logger.exception("ValueError creating lab '%s'", slug)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid input data",
        )
    except Exception:
        db.rollback()
        logger.exception("Unexpected error creating lab '%s'", slug)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create lab definition",
        )
# app/routers/LabGuide/guides.py
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import logging

from app.config.connection.postgres_client import get_db
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.schemas.LabDefinition.LabGuide import (
    LabGuideCreate,
    LabGuideUpdate,
    LabGuideResponse,
    LabGuideListItem,
    GuideVersionCreate,
    GuideVersionResponse,
    GuideVersionListItem,
    LabGuideAssignRequest,
)
from app.services.LabGuide.guide_service import (
    create_guide,
    create_version,
    publish_version,
    set_current_version,
    get_guide_with_current_version,
    get_version_with_guide,
    list_guides,
    list_versions,
    update_guide,
    delete_guide,
    delete_version,
    assign_guide_version_to_lab,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lab-guides", tags=["lab-guides"])


def _get_user_id(userinfo: dict) -> str:
    uid = userinfo.get("sub")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identifier",
        )
    return uid


def _is_trainee_only(userinfo: dict) -> bool:
    roles = userinfo.get("realm_access", {}).get("roles", [])
    return "trainee" in roles and "moderator" not in roles and "admin" not in roles


# ── Guide CRUD ────────────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=LabGuideResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_guide(
    data: LabGuideCreate,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["moderator", "admin"])),
):
    """Create a new logical guide. Optionally creates version 1 if initial_steps provided."""
    user_id = _get_user_id(userinfo)
    logger.info("Guide create attempt: user=%s title=%s", user_id, data.title)
    guide = create_guide(db, data, user_id)
    return _build_guide_response(guide)


@router.get(
    "/",
    response_model=List[LabGuideListItem],
)
def list_guides_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["trainee", "moderator", "admin"])),
):
    """List guides. Trainees only see guides with published current versions."""
    guides, total = list_guides(db, skip, limit, search=search)

    result = []
    for guide in guides:
        current_version = guide.current_version
        is_published = current_version.is_published if current_version else False

        if _is_trainee_only(userinfo) and not is_published:
            continue

        result.append(
            LabGuideListItem(
                id=guide.id,
                title=guide.title,
                current_version_id=guide.current_version_id,
                current_version_number=current_version.version_number if current_version else None,
                current_version_published=is_published,
                created_at=guide.created_at,
                step_count=len(current_version.steps) if current_version and current_version.steps else 0,
            )
        )
    return result


@router.get(
    "/{guide_id}",
    response_model=LabGuideResponse,
)
def get_guide_endpoint(
    guide_id: UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["trainee", "moderator", "admin"])),
):
    """Get a guide with its current version."""
    guide = get_guide_with_current_version(db, guide_id)
    if not guide:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

    current_version = guide.current_version
    if _is_trainee_only(userinfo):
        if not current_version or not current_version.is_published:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This guide has no published version",
            )

    return _build_guide_response(guide)


@router.put(
    "/{guide_id}",
    response_model=LabGuideResponse,
)
def update_guide_endpoint(
    guide_id: UUID,
    data: LabGuideUpdate,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["moderator", "admin"])),
):
    """Update guide metadata (title only). Does not modify versions."""
    user_id = _get_user_id(userinfo)
    logger.info("Guide update attempt: user=%s guide_id=%s", user_id, guide_id)
    guide = update_guide(db, guide_id, data, user_id)
    return _build_guide_response(guide)


@router.delete(
    "/{guide_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_guide_endpoint(
    guide_id: UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["moderator", "admin"])),
):
    """Delete a guide and all its versions. Fails if any version is assigned to a lab."""
    delete_guide(db, guide_id)
    return None


# ── Version Management ─────────────────────────────────────────────────────────

@router.post(
    "/{guide_id}/versions",
    response_model=GuideVersionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_version_endpoint(
    guide_id: UUID,
    data: GuideVersionCreate,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["moderator", "admin"])),
):
    """Create a new immutable version for a guide."""
    user_id = _get_user_id(userinfo)
    logger.info("Version create attempt: user=%s guide_id=%s", user_id, guide_id)
    version = create_version(db, guide_id, data, user_id)
    return _build_version_response(version)


@router.get(
    "/{guide_id}/versions",
    response_model=List[GuideVersionListItem],
)
def list_versions_endpoint(
    guide_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["moderator", "admin"])),
):
    """List all versions of a guide. Moderators/admins only."""
    versions, total = list_versions(db, guide_id, skip, limit)
    return [
        GuideVersionListItem(
            id=v.id,
            version_number=v.version_number,
            is_published=v.is_published,
            created_at=v.created_at,
            step_count=len(v.steps) if v.steps else 0,
        )
        for v in versions
    ]


@router.get(
    "/{guide_id}/versions/{version_id}",
    response_model=GuideVersionResponse,
)
def get_version_endpoint(
    guide_id: UUID,
    version_id: UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["trainee", "moderator", "admin"])),
):
    """Get a specific version of a guide."""
    version = get_version_with_guide(db, guide_id, version_id)
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

    if _is_trainee_only(userinfo) and not version.is_published:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This version is not published",
        )

    return _build_version_response(version)


@router.post(
    "/{guide_id}/versions/{version_id}/publish",
    response_model=GuideVersionResponse,
)
def publish_version_endpoint(
    guide_id: UUID,
    version_id: UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["moderator", "admin"])),
):
    """Publish a version and set it as the current version."""
    user_id = _get_user_id(userinfo)
    version = publish_version(db, guide_id, version_id, user_id)
    return _build_version_response(version)


@router.post(
    "/{guide_id}/versions/{version_id}/set-current",
    response_model=LabGuideResponse,
)
def set_current_version_endpoint(
    guide_id: UUID,
    version_id: UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["moderator", "admin"])),
):
    """Set a specific version as the current version for this guide."""
    user_id = _get_user_id(userinfo)
    guide = set_current_version(db, guide_id, version_id, user_id)
    return _build_guide_response(guide)


@router.delete(
    "/{guide_id}/versions/{version_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_version_endpoint(
    guide_id: UUID,
    version_id: UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["moderator", "admin"])),
):
    """Delete a version. Fails if assigned to any lab. Auto-promotes latest if it was current."""
    delete_version(db, guide_id, version_id)
    return None


# ── Assignment to Lab Definition ──────────────────────────────────────────────

@router.post(
    "/versions/{guide_version_id}/assign",
    status_code=status.HTTP_200_OK,
)
def assign_guide_version_to_lab_endpoint(
    guide_version_id: UUID,
    body: LabGuideAssignRequest,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["moderator", "admin"])),
):
    """Assign a specific guide version to a lab definition. Must be published."""
    lab = assign_guide_version_to_lab(db, guide_version_id, body.lab_definition_id)
    return {
        "message": f"Guide version assigned to lab '{lab.name}'",
        "lab_id": str(lab.id),
        "guide_version_id": str(guide_version_id),
    }


# ── Response Builders ──────────────────────────────────────────────────────────

def _build_guide_response(guide) -> dict:
    current_version = guide.current_version
    total_versions = len(guide.versions) if guide.versions else 0

    return {
        "id": guide.id,
        "title": guide.title,
        "created_by": guide.created_by,
        "created_at": guide.created_at,
        "updated_at": guide.updated_at,
        "updated_by": guide.updated_by,
        "current_version_id": guide.current_version_id,
        "current_version": _build_version_response(current_version) if current_version else None,
        "total_versions": total_versions,
    }


def _build_version_response(version) -> dict:
    if version is None:
        return None
    return {
        "id": version.id,
        "guide_id": version.guide_id,
        "version_number": version.version_number,
        "created_by": version.created_by,
        "created_at": version.created_at,
        "is_published": version.is_published,
        "published_at": version.published_at,
        "steps": version.steps or [],
        "step_count": len(version.steps) if version.steps else 0,
    }
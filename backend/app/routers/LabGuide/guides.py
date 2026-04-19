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
    LabGuideStepCreate,
    LabGuideStepResponse,
)
from app.services.LabGuide.guide_service import (
    create_guide,
    get_guide_with_steps,
    list_guides,
    update_guide,
    delete_guide,
    assign_guide_to_lab,
)
from app.services.LabGuide.step_service import create_step
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lab-guides", tags=["lab-guides"])


def _get_user_id(userinfo) -> str:
    uid = userinfo.get("sub")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identifier",
        )
    return uid


def _is_trainee_only(userinfo) -> bool:
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
    userinfo=Depends(require_any_role(["moderator", "admin"])),
):
    """Create a new standalone guide with steps."""
    user_id = _get_user_id(userinfo)
    logger.info("Guide create attempt: user=%s title=%s", user_id, data.title)
    return create_guide(db, data, user_id)


@router.get(
    "/",
    response_model=List[LabGuideListItem],
)
def list_guides_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    category: Optional[str] = None,
    is_published: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    userinfo=Depends(require_any_role(["trainee", "moderator", "admin"])),
):
    """List guides. Trainees only see published guides."""
    if _is_trainee_only(userinfo):
        is_published = True

    guides, total = list_guides(db, skip, limit, category, is_published, search)

    result = []
    for guide in guides:
        result.append(
            LabGuideListItem(
                id=guide.id,
                title=guide.title,
                description=guide.description,
                category=guide.category,
                difficulty=guide.difficulty,
                estimated_duration_minutes=guide.estimated_duration_minutes,
                tags=guide.tags or [],
                is_published=guide.is_published,
                created_at=guide.created_at,
                step_count=len(guide.steps),
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
    userinfo=Depends(require_any_role(["trainee", "moderator", "admin"])),
):
    """Get a single guide with all steps."""
    guide = get_guide_with_steps(db, guide_id)
    if not guide:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

    if _is_trainee_only(userinfo) and not guide.is_published:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This guide is not published yet",
        )

    return guide


@router.put(
    "/{guide_id}",
    response_model=LabGuideResponse,
)
def update_guide_endpoint(
    guide_id: UUID,
    data: LabGuideUpdate,
    db: Session = Depends(get_db),
    userinfo=Depends(require_any_role(["moderator", "admin"])),
):
    """Full update of a guide, including replacement of all steps."""
    user_id = _get_user_id(userinfo)
    logger.info("Guide update attempt: user=%s guide_id=%s", user_id, guide_id)
    return update_guide(db, guide_id, data, user_id)


@router.delete(
    "/{guide_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_guide_endpoint(
    guide_id: UUID,
    db: Session = Depends(get_db),
    userinfo=Depends(require_any_role(["moderator", "admin"])),
):
    """Delete a guide. Fails if assigned to any lab."""
    delete_guide(db, guide_id)
    return None


# ── Step management (convenience routes under guide) ──────────────────────────

@router.post(
    "/{guide_id}/steps",
    response_model=LabGuideStepResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_step_to_guide(
    guide_id: UUID,
    data: LabGuideStepCreate,
    db: Session = Depends(get_db),
    userinfo=Depends(require_any_role(["moderator", "admin"])),
):
    """Append a new step to an existing guide."""
    return create_step(db, guide_id, data)


# ── Assignment to Lab Definition ──────────────────────────────────────────────

class _AssignGuideRequest(BaseModel):
    lab_definition_id: UUID


@router.post(
    "/{guide_id}/assign",
    status_code=status.HTTP_200_OK,
)
def assign_guide_to_lab_endpoint(
    guide_id: UUID,
    body: _AssignGuideRequest,
    db: Session = Depends(get_db),
    userinfo=Depends(require_any_role(["moderator", "admin"])),
):
    """Assign this guide to a lab definition."""
    lab = assign_guide_to_lab(db, guide_id, body.lab_definition_id)
    return {"message": f"Guide assigned to lab '{lab.name}'", "lab_id": str(lab.id)}
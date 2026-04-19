# app/routers/LabGuide/steps.py
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.config.connection.postgres_client import get_db
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.schemas.LabDefinition.LabGuide import LabGuideStepUpdate, LabGuideStepResponse
from app.services.LabGuide.step_service import update_step, delete_step, reorder_steps
from app.services.LabGuide.guide_service import get_guide_with_steps
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lab-guides/{guide_id}/steps", tags=["lab-guide-steps"])


@router.put(
    "/{step_id}",
    response_model=LabGuideStepResponse,
)
def update_step_endpoint(
    guide_id: UUID,
    step_id: UUID,
    data: LabGuideStepUpdate,
    db: Session = Depends(get_db),
    userinfo=Depends(require_any_role(["moderator", "admin"])),
):
    """Update a single step (partial update)."""
    guide = get_guide_with_steps(db, guide_id)
    if not guide:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

    return update_step(db, step_id, data)


@router.delete(
    "/{step_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_step_endpoint(
    guide_id: UUID,
    step_id: UUID,
    db: Session = Depends(get_db),
    userinfo=Depends(require_any_role(["moderator", "admin"])),
):
    """Delete a single step from a guide."""
    guide = get_guide_with_steps(db, guide_id)
    if not guide:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

    delete_step(db, step_id)
    return None


class _ReorderItem(BaseModel):
    step_id: UUID
    order: int


@router.post(
    "/reorder",
    response_model=List[LabGuideStepResponse],
)
def reorder_steps_endpoint(
    guide_id: UUID,
    items: List[_ReorderItem],
    db: Session = Depends(get_db),
    userinfo=Depends(require_any_role(["moderator", "admin"])),
):
    """Bulk reorder steps within a guide."""
    guide = get_guide_with_steps(db, guide_id)
    if not guide:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

    payload = [{"step_id": str(item.step_id), "order": item.order} for item in items]
    return reorder_steps(db, guide_id, payload)
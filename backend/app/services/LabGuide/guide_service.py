# app/services/LabGuide/guide_service.py
from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import asc
from fastapi import HTTPException, status
import logging

from app.models.LabDefinition.LabGuide import LabGuide, LabGuideStep
from app.models.LabDefinition.core import LabDefinition
from app.schemas.LabDefinition.LabGuide import (
    LabGuideCreate,
    LabGuideUpdate,
    LabGuideStepCreate,
)

logger = logging.getLogger(__name__)


def _serialize_step_data(step_data: LabGuideStepCreate) -> dict:
    """Convert Pydantic step data into DB-compatible dicts for JSONB columns."""
    return {
        "title": step_data.title,
        "description": step_data.description,
        "target_vm_name": step_data.target_vm_name,
        "theory_content": step_data.theory_content,
        "commands": [cmd.model_dump(mode="json") for cmd in step_data.commands] if step_data.commands else [],
        "tasks": [task.model_dump(mode="json") for task in step_data.tasks] if step_data.tasks else [],
        "hints": [hint.model_dump(mode="json") for hint in step_data.hints] if step_data.hints else [],
        "validations": [val.model_dump(mode="json") for val in step_data.validations] if step_data.validations else [],
        "quiz": step_data.quiz.model_dump(mode="json") if step_data.quiz else None,
        "points": step_data.points,
    }


def create_guide(db: Session, data: LabGuideCreate, user_id: str) -> LabGuide:
    guide = LabGuide(
        title=data.title,
        description=data.description,
        category=data.category,
        difficulty=data.difficulty,
        estimated_duration_minutes=data.estimated_duration_minutes,
        tags=data.tags or [],
        is_published=data.is_published,
        created_by=user_id,
    )
    db.add(guide)
    db.flush()

    for idx, step_data in enumerate(data.steps):
        payload = _serialize_step_data(step_data)
        step = LabGuideStep(
            guide_id=guide.id,
            order=step_data.order if step_data.order is not None else idx,
            **payload,
        )
        db.add(step)

    db.commit()
    db.refresh(guide)
    logger.info("Guide created: id=%s title=%s user=%s", guide.id, guide.title, user_id)
    return guide


def get_guide(db: Session, guide_id: UUID) -> Optional[LabGuide]:
    return db.query(LabGuide).filter(LabGuide.id == guide_id).first()


def get_guide_with_steps(db: Session, guide_id: UUID) -> Optional[LabGuide]:
    guide = db.query(LabGuide).filter(LabGuide.id == guide_id).first()
    if guide and guide.steps:
        guide.steps = sorted(guide.steps, key=lambda s: s.order)
    return guide


def list_guides(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    is_published: Optional[bool] = None,
    search: Optional[str] = None,
) -> Tuple[List[LabGuide], int]:
    query = db.query(LabGuide)

    if category:
        query = query.filter(LabGuide.category == category)
    if is_published is not None:
        query = query.filter(LabGuide.is_published == is_published)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            LabGuide.title.ilike(pattern) | LabGuide.description.ilike(pattern)
        )

    total = query.count()
    guides = query.order_by(asc(LabGuide.created_at)).offset(skip).limit(limit).all()
    return guides, total


def update_guide(
    db: Session, guide_id: UUID, data: LabGuideUpdate, user_id: str
) -> LabGuide:
    guide = db.query(LabGuide).filter(LabGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

    update_fields = data.model_dump(exclude_unset=True, exclude={"steps"})
    for field, value in update_fields.items():
        setattr(guide, field, value)

    guide.updated_by = user_id

    if data.steps is not None:
        db.query(LabGuideStep).filter(LabGuideStep.guide_id == guide_id).delete()
        for idx, step_data in enumerate(data.steps):
            payload = _serialize_step_data(step_data)
            step = LabGuideStep(
                guide_id=guide.id,
                order=step_data.order if step_data.order is not None else idx,
                **payload,
            )
            db.add(step)

    db.commit()
    db.refresh(guide)
    logger.info("Guide updated: id=%s user=%s", guide.id, user_id)
    return guide


def delete_guide(db: Session, guide_id: UUID) -> None:
    guide = db.query(LabGuide).filter(LabGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

    if guide.lab_definitions:
        names = ", ".join([lab.name for lab in guide.lab_definitions[:3]])
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Guide is assigned to labs: {names}. Unassign before deleting.",
        )

    db.delete(guide)
    db.commit()
    logger.info("Guide deleted: id=%s", guide_id)


def assign_guide_to_lab(db: Session, guide_id: UUID, lab_definition_id: UUID) -> LabDefinition:
    guide = db.query(LabGuide).filter(LabGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

    lab = db.query(LabDefinition).filter(LabDefinition.id == lab_definition_id).first()
    if not lab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab definition not found")

    lab.guide_id = guide_id
    db.commit()
    db.refresh(lab)
    logger.info("Guide assigned: guide_id=%s lab_id=%s", guide_id, lab_definition_id)
    return lab
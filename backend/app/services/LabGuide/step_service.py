# app/services/LabGuide/step_service.py
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
import logging

from app.models.LabDefinition.LabGuide import LabGuide, LabGuideStep
from app.schemas.LabDefinition.LabGuide import LabGuideStepCreate, LabGuideStepUpdate

logger = logging.getLogger(__name__)


def create_step(db: Session, guide_id: UUID, data: LabGuideStepCreate) -> LabGuideStep:
    guide = db.query(LabGuide).filter(LabGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

    order = data.order
    if order is None:
        max_order = db.query(func.max(LabGuideStep.order)).filter(
            LabGuideStep.guide_id == guide_id
        ).scalar()
        order = (max_order or 0) + 1

    step = LabGuideStep(
        guide_id=guide_id,
        order=order,
        title=data.title,
        description=data.description,
        target_vm_name=data.target_vm_name,
        theory_content=data.theory_content,
        commands=[cmd.model_dump(mode="json") for cmd in data.commands] if data.commands else [],
        tasks=[task.model_dump(mode="json") for task in data.tasks] if data.tasks else [],
        hints=[hint.model_dump(mode="json") for hint in data.hints] if data.hints else [],
        validations=[val.model_dump(mode="json") for val in data.validations] if data.validations else [],
        quiz=data.quiz.model_dump(mode="json") if data.quiz else None,
        points=data.points,
    )
    db.add(step)
    db.commit()
    db.refresh(step)
    logger.info("Step created: id=%s guide_id=%s order=%s", step.id, guide_id, order)
    return step


def get_step(db: Session, step_id: UUID) -> Optional[LabGuideStep]:
    return db.query(LabGuideStep).filter(LabGuideStep.id == step_id).first()


def update_step(db: Session, step_id: UUID, data: LabGuideStepUpdate) -> LabGuideStep:
    step = db.query(LabGuideStep).filter(LabGuideStep.id == step_id).first()
    if not step:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ("commands", "tasks", "hints", "validations") and value is not None:
            value = [v.model_dump(mode="json") if hasattr(v, "model_dump") else v for v in value]
        elif field == "quiz" and value is not None:
            value = value.model_dump(mode="json") if hasattr(value, "model_dump") else value
        setattr(step, field, value)

    db.commit()
    db.refresh(step)
    logger.info("Step updated: id=%s", step_id)
    return step


def delete_step(db: Session, step_id: UUID) -> None:
    step = db.query(LabGuideStep).filter(LabGuideStep.id == step_id).first()
    if not step:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step not found")

    db.delete(step)
    db.commit()
    logger.info("Step deleted: id=%s", step_id)


def reorder_steps(db: Session, guide_id: UUID, step_orders: List[dict]) -> List[LabGuideStep]:
    for item in step_orders:
        step_id = item.get("step_id")
        new_order = item.get("order")
        if step_id is None or new_order is None:
            continue

        step = db.query(LabGuideStep).filter(
            LabGuideStep.id == step_id,
            LabGuideStep.guide_id == guide_id,
        ).first()
        if step:
            step.order = new_order

    db.commit()
    steps = db.query(LabGuideStep).filter(
        LabGuideStep.guide_id == guide_id
    ).order_by(LabGuideStep.order).all()
    return steps
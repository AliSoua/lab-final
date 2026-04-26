# app/services/LabGuide/guide_service.py
from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import asc, func
from fastapi import HTTPException, status
import logging
from datetime import datetime

from app.models.LabDefinition.LabGuide import LabGuide, GuideVersion
from app.models.LabDefinition.core import LabDefinition
from app.schemas.LabDefinition.LabGuide import (
    LabGuideCreate,
    LabGuideUpdate,
    GuideVersionCreate,
)

logger = logging.getLogger(__name__)


def _serialize_steps(steps_data: list) -> list:
    """Convert Pydantic step models into plain dicts for JSONB storage."""
    result = []
    for step in steps_data:
        if hasattr(step, "model_dump"):
            step_dict = step.model_dump(mode="json")
        elif hasattr(step, "dict"):
            step_dict = step.dict()
        else:
            step_dict = dict(step)
        result.append(step_dict)
    return result


def _version_to_response_dict(version: GuideVersion) -> dict:
    """Convert a GuideVersion ORM object to a dict matching GuideVersionResponse."""
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


def create_guide(db: Session, data: LabGuideCreate, user_id: str) -> LabGuide:
    """Create a new logical guide. Optionally creates version 1."""
    guide = LabGuide(
        title=data.title,
        created_by=user_id,
        updated_by=user_id,
    )
    db.add(guide)
    db.flush()

    if data.initial_steps:
        version = GuideVersion(
            guide_id=guide.id,
            version_number=1,
            created_by=user_id,
            is_published=data.is_published,
            steps=_serialize_steps(data.initial_steps),
        )
        db.add(version)
        db.flush()
        guide.current_version_id = version.id

    db.commit()
    db.refresh(guide)
    logger.info("Guide created: id=%s title=%s user=%s", guide.id, guide.title, user_id)
    return guide


def create_version(
    db: Session,
    guide_id: UUID,
    data: GuideVersionCreate,
    user_id: str,
) -> GuideVersion:
    """Create a new immutable version for an existing guide."""
    guide = db.query(LabGuide).filter(LabGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

    max_version = db.query(func.max(GuideVersion.version_number)).filter(
        GuideVersion.guide_id == guide_id
    ).scalar()
    next_version = (max_version or 0) + 1

    version = GuideVersion(
        guide_id=guide_id,
        version_number=next_version,
        created_by=user_id,
        is_published=data.is_published,
        steps=_serialize_steps(data.steps),
    )
    db.add(version)
    db.flush()

    if not guide.current_version_id:
        guide.current_version_id = version.id

    db.commit()
    db.refresh(version)
    logger.info("Version created: id=%s guide_id=%s v=%s user=%s", version.id, guide_id, next_version, user_id)
    return version


def publish_version(db: Session, guide_id: UUID, version_id: UUID, user_id: str) -> GuideVersion:
    """Publish a version and promote it to current."""
    version = db.query(GuideVersion).filter(
        GuideVersion.id == version_id,
        GuideVersion.guide_id == guide_id,
    ).first()
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

    guide = db.query(LabGuide).filter(LabGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

    version.is_published = True
    version.published_at = datetime.utcnow()

    guide.current_version_id = version.id
    guide.updated_by = user_id
    guide.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(version)
    logger.info("Version published: id=%s guide_id=%s", version_id, guide_id)
    return version


def set_current_version(db: Session, guide_id: UUID, version_id: UUID, user_id: str) -> LabGuide:
    """Set a specific version as the current version."""
    guide = db.query(LabGuide).filter(LabGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

    version = db.query(GuideVersion).filter(
        GuideVersion.id == version_id,
        GuideVersion.guide_id == guide_id,
    ).first()
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found in this guide")

    guide.current_version_id = version_id
    guide.updated_by = user_id
    guide.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(guide)
    logger.info("Current version set: guide_id=%s version_id=%s", guide_id, version_id)
    return guide


def get_guide(db: Session, guide_id: UUID) -> Optional[LabGuide]:
    return db.query(LabGuide).filter(LabGuide.id == guide_id).first()


def get_guide_with_current_version(db: Session, guide_id: UUID) -> Optional[LabGuide]:
    """Load guide with current_version eagerly via joinedload."""
    from sqlalchemy.orm import joinedload
    return (
        db.query(LabGuide)
        .options(joinedload(LabGuide.current_version))
        .filter(LabGuide.id == guide_id)
        .first()
    )


def get_version(db: Session, version_id: UUID) -> Optional[GuideVersion]:
    return db.query(GuideVersion).filter(GuideVersion.id == version_id).first()


def get_version_with_guide(db: Session, guide_id: UUID, version_id: UUID) -> Optional[GuideVersion]:
    return db.query(GuideVersion).filter(
        GuideVersion.id == version_id,
        GuideVersion.guide_id == guide_id,
    ).first()


def list_guides(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
) -> Tuple[List[LabGuide], int]:
    query = db.query(LabGuide)

    if search:
        pattern = f"%{search}%"
        query = query.filter(LabGuide.title.ilike(pattern))

    total = query.count()
    guides = query.order_by(asc(LabGuide.created_at)).offset(skip).limit(limit).all()
    return guides, total


def list_versions(
    db: Session,
    guide_id: UUID,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[GuideVersion], int]:
    query = db.query(GuideVersion).filter(GuideVersion.guide_id == guide_id)
    total = query.count()
    versions = query.order_by(GuideVersion.version_number.desc()).offset(skip).limit(limit).all()
    return versions, total


def update_guide(
    db: Session, guide_id: UUID, data: LabGuideUpdate, user_id: str
) -> LabGuide:
    guide = db.query(LabGuide).filter(LabGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(guide, field, value)

    guide.updated_by = user_id
    guide.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(guide)
    logger.info("Guide updated: id=%s user=%s", guide.id, user_id)
    return guide


def delete_guide(db: Session, guide_id: UUID) -> None:
    guide = db.query(LabGuide).filter(LabGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

    versions = db.query(GuideVersion).filter(GuideVersion.guide_id == guide_id).all()
    version_ids = [v.id for v in versions]

    if version_ids:
        assigned_labs = db.query(LabDefinition).filter(
            LabDefinition.guide_version_id.in_(version_ids)
        ).all()

        if assigned_labs:
            names = ", ".join([lab.name for lab in assigned_labs[:3]])
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Guide versions assigned to labs: {names}. Unassign before deleting.",
            )

    db.delete(guide)
    db.commit()
    logger.info("Guide deleted: id=%s", guide_id)


def delete_version(db: Session, guide_id: UUID, version_id: UUID) -> None:
    version = db.query(GuideVersion).filter(
        GuideVersion.id == version_id,
        GuideVersion.guide_id == guide_id,
    ).first()
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

    assigned = db.query(LabDefinition).filter(LabDefinition.guide_version_id == version_id).first()
    if assigned:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Version is assigned to lab '{assigned.name}'. Unassign before deleting.",
        )

    guide = db.query(LabGuide).filter(LabGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")

    was_current = guide.current_version_id == version_id

    db.delete(version)
    db.flush()

    if was_current:
        latest = db.query(GuideVersion).filter(
            GuideVersion.guide_id == guide_id
        ).order_by(GuideVersion.version_number.desc()).first()
        guide.current_version_id = latest.id if latest else None

    db.commit()
    logger.info("Version deleted: id=%s guide_id=%s", version_id, guide_id)


def assign_guide_version_to_lab(
    db: Session, guide_version_id: UUID, lab_definition_id: UUID
) -> LabDefinition:
    version = db.query(GuideVersion).filter(GuideVersion.id == guide_version_id).first()
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide version not found")

    if not version.is_published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign unpublished guide version to a lab",
        )

    lab = db.query(LabDefinition).filter(LabDefinition.id == lab_definition_id).first()
    if not lab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab definition not found")

    lab.guide_version_id = guide_version_id
    db.commit()
    db.refresh(lab)
    logger.info("Guide version assigned: version_id=%s lab_id=%s", guide_version_id, lab_definition_id)
    return lab
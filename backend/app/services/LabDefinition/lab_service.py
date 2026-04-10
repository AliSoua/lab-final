# app/services/LabDefinition/lab_service.py
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.LabDefinition.core import LabDefinition
from app.schemas.LabDefinition.core import LabDefinitionCreate, LabDefinitionUpdate


class LabService:
    """
    Business logic layer for LabDefinition
    """

    def create_lab(self, db: Session, data: LabDefinitionCreate) -> LabDefinition:
        lab = LabDefinition(**data.model_dump())
        db.add(lab)
        db.commit()
        db.refresh(lab)
        return lab

    def get_lab(self, db: Session, lab_id: UUID) -> LabDefinition | None:
        return db.query(LabDefinition).filter(LabDefinition.id == lab_id).first()

    def get_by_slug(self, db: Session, slug: str) -> LabDefinition | None:
        return db.query(LabDefinition).filter(LabDefinition.slug == slug).first()

    def update_lab(
        self,
        db: Session,
        lab: LabDefinition,
        data: LabDefinitionUpdate
    ) -> LabDefinition:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(lab, key, value)

        db.commit()
        db.refresh(lab)
        return lab

    def delete_lab(self, db: Session, lab: LabDefinition) -> None:
        db.delete(lab)
        db.commit()
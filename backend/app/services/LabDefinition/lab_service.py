# app/services/LabDefinition/lab_service.py

from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models.LabDefinition.core import LabDefinition
from app.schemas.LabDefinition.core import LabDefinitionCreate, LabDefinitionUpdate


class LabService:
    """
    Business logic layer for LabDefinition
    """

    def create_lab(self, db: Session, data: dict | LabDefinitionCreate) -> LabDefinition:
        """
        Create a new lab definition.
        
        Args:
            data: LabDefinitionCreate schema or dict with lab data
            
        Raises:
            HTTPException: 409 if slug already exists
        """
        # Normalize to dict if schema passed
        if isinstance(data, LabDefinitionCreate):
            data = data.model_dump()
        
        # Check for slug uniqueness before creation
        existing = db.query(LabDefinition).filter(
            LabDefinition.slug == data.get("slug")
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Lab with slug '{data['slug']}' already exists"
            )
        
        try:
            lab = LabDefinition(**data)
            db.add(lab)
            db.commit()
            db.refresh(lab)
            return lab
        except IntegrityError as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Database integrity error: {str(e)}"
            )

    def get_lab(self, db: Session, lab_id: UUID) -> LabDefinition | None:
        """Get lab by ID."""
        return db.query(LabDefinition).filter(LabDefinition.id == lab_id).first()

    def get_by_slug(self, db: Session, slug: str) -> LabDefinition | None:
        """Get lab by slug."""
        return db.query(LabDefinition).filter(LabDefinition.slug == slug).first()

    def update_lab(
        self,
        db: Session,
        lab: LabDefinition,
        data: LabDefinitionUpdate
    ) -> LabDefinition:
        """Update lab with new data."""
        update_dict = data.model_dump(exclude_unset=True)
        
        for key, value in update_dict.items():
            setattr(lab, key, value)

        db.commit()
        db.refresh(lab)
        return lab

    def delete_lab(self, db: Session, lab: LabDefinition) -> None:
        """Delete lab and its associated images."""
        # Import here to avoid circular dependency
        from app.services.file_upload_service import file_upload_service
        
        # Delete associated images if any
        if lab.thumbnail_url:
            file_upload_service.delete_lab_images(lab.id)
        
        db.delete(lab)
        db.commit()

    def get_lab_by_id(self, db: Session, lab_id: UUID) -> LabDefinition | None:
        """Alias for get_lab - for compatibility."""
        return self.get_lab(db, lab_id)
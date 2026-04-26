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

    def create_lab(
        self,
        db: Session,
        data: dict | LabDefinitionCreate,
        user_id: str | None = None,
    ) -> LabDefinition:
        """
        Create a new lab definition.
        
        Args:
            data: LabDefinitionCreate schema or dict with lab data
            user_id: Keycloak user ID (sub). Required if data doesn't contain created_by.
            
        Raises:
            HTTPException: 409 if slug already exists
            HTTPException: 400 if created_by is missing and user_id not provided
        """
        # Normalize to dict if schema passed
        if isinstance(data, LabDefinitionCreate):
            data = data.model_dump()
        else:
            data = dict(data)
        
        # ── FIX: Enforce created_by presence ────────────────────────────────
        # The DB model requires created_by (nullable=False). The router should
        # inject it, but we defensively require it here too.
        if not data.get("created_by") and not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="created_by (user_id) is required to create a lab definition"
            )
        
        if user_id and not data.get("created_by"):
            data["created_by"] = user_id
        
        # Check for slug uniqueness before creation
        slug = data.get("slug")
        if not slug:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="slug is required"
            )
            
        existing = db.query(LabDefinition).filter(
            LabDefinition.slug == slug
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Lab with slug '{slug}' already exists"
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
        data: LabDefinitionUpdate,
        user_id: str | None = None,
    ) -> LabDefinition:
        """Update lab with new data."""
        update_dict = data.model_dump(exclude_unset=True)
        
        # ── FIX: Auto-inject updated_by if provided by caller but not in schema ─
        if user_id and "updated_by" not in update_dict:
            update_dict["updated_by"] = user_id
        
        for key, value in update_dict.items():
            setattr(lab, key, value)

        db.commit()
        db.refresh(lab)
        return lab

    def delete_lab(self, db: Session, lab: LabDefinition) -> None:
        """Delete lab and its associated images."""
        # Import here to avoid circular dependency
        from app.services.file_upload_service import file_upload_service
        
        # Delete associated images if any (best-effort; don't fail lab deletion)
        if lab.thumbnail_url:
            try:
                file_upload_service.delete_lab_images(lab.id)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(
                    "Failed to delete images for lab %s: %s", lab.id, e
                )
        
        db.delete(lab)
        db.commit()

    def get_lab_by_id(self, db: Session, lab_id: UUID) -> LabDefinition | None:
        """Alias for get_lab - for compatibility."""
        return self.get_lab(db, lab_id)
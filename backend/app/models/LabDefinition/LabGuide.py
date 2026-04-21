# app/models/LabDefinition/LabGuide.py
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Integer, Text, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class LabGuide(Base):
    """Logical guide entity. Mutable metadata, immutable versions."""
    __tablename__ = "lab_guides"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    title = Column(String(255), nullable=False)

    created_by = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String(255), nullable=True)

    # Points to the current published/draft version
    current_version_id = Column(
        UUID(as_uuid=True),
        ForeignKey("guide_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    versions = relationship(
        "GuideVersion",
        back_populates="guide",
        cascade="all, delete-orphan",
        foreign_keys="GuideVersion.guide_id",
        order_by="GuideVersion.version_number.desc()",
    )
    current_version = relationship(
        "GuideVersion",
        foreign_keys=[current_version_id],
        post_update=True,
    )

    def __repr__(self):
        return f"<LabGuide(id={self.id}, title={self.title})>"


class GuideVersion(Base):
    """Immutable snapshot of guide content. Never modified after creation."""
    __tablename__ = "guide_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    guide_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lab_guides.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    version_number = Column(Integer, nullable=False, default=1)
    created_by = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    is_published = Column(Boolean, default=False, nullable=False, index=True)
    published_at = Column(DateTime(timezone=True), nullable=True)

    # All steps stored as immutable JSONB array
    steps = Column(JSONB, default=list, nullable=False)

    # Relationships
    guide = relationship("LabGuide", back_populates="versions", foreign_keys=[guide_id])
    assigned_labs = relationship("LabDefinition", back_populates="guide_version")

    __table_args__ = (
        UniqueConstraint("guide_id", "version_number", name="uq_guide_version_number"),
    )

    def __repr__(self):
        return f"<GuideVersion(id={self.id}, guide_id={self.guide_id}, v={self.version_number})>"
# app/models/LabDefinition/core.py
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Integer, Text, ARRAY, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class LabDefinition(Base):
    __tablename__ = "lab_definitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Basic Info
    slug = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    short_description = Column(String(500))

    # Metadata
    created_by = Column(String(255), nullable=False, index=True)
    # ← FIX: timezone-aware UTC
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    # ← FIX: timezone-aware UTC
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    updated_by = Column(String(255))

    # Publishing
    status = Column(String(50), default="draft", index=True)
    published_at = Column(DateTime(timezone=True))

    # Lab Settings
    duration_minutes = Column(Integer, default=60)
    max_concurrent_users = Column(Integer, default=1)
    cooldown_minutes = Column(Integer, default=0)

    # Classification
    difficulty = Column(String(50), default="beginner")
    category = Column(String(100), index=True)
    track = Column(String(100))

    thumbnail_url = Column(String(500))

    # Learning Content
    objectives = Column(ARRAY(String), default=list, nullable=False)
    prerequisites = Column(ARRAY(String), default=list, nullable=False)
    tags = Column(ARRAY(String), default=list, nullable=False, index=True)

    # Infrastructure (vsphere | proxmox)
    infrastructure_provider = Column(String(50), default="vsphere", nullable=False, index=True)

    # Featured
    is_featured = Column(Boolean, default=False, index=True)
    featured_priority = Column(Integer, default=0, index=True)

    # Guide Version (immutable, assignable)
    guide_version_id = Column(
        UUID(as_uuid=True),
        ForeignKey("guide_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Connection Slots (assigned existing connections: slug + protocol flags)
    # CHANGED: JSON -> JSONB for consistency with guacamole_connections and
    # better PostgreSQL performance/indexing support.
    connection_slots = Column(JSONB, default=list, nullable=False)

    # Relationships
    vms = relationship(
        "LabVM",
        back_populates="lab",
        cascade="all, delete-orphan",
        order_by="LabVM.order"
    )
    
    guide_version = relationship("GuideVersion", back_populates="assigned_labs")

    instances = relationship(
        "LabInstance",
        back_populates="lab_definition",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<LabDefinition(id={self.id}, name={self.name}, provider={self.infrastructure_provider})>"
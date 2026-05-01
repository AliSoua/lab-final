# app/models/user.py
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Integer, Boolean, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class User(Base):
    """
    User profile model synced from Keycloak with platform-specific metadata.

    Keycloak data (email, name, role) is synced and read-only.
    Platform metadata (stats, badges, preferences) is editable.
    """
    __tablename__ = "users"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Keycloak Sync Fields (read-only, source of truth from Keycloak)
    keycloak_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    role = Column(String(50), nullable=False, default="trainee")
    is_active = Column(Boolean, nullable=False, default=True)

    # Profile Metadata (editable by user)
    avatar_url = Column(String(500))
    bio = Column(Text)
    job_title = Column(String(100))
    department = Column(String(100))
    phone = Column(String(50))
    timezone = Column(String(50), default="UTC")

    # Platform-Specific Metadata (lab platform data)
    total_labs_completed = Column(Integer, default=0)
    total_labs_in_progress = Column(Integer, default=0)
    total_time_spent_minutes = Column(Integer, default=0)
    skill_level = Column(String(50), default="beginner")
    certifications = Column(JSONB, default=list)
    preferences = Column(JSONB, default=dict)

    # Gamification/Engagement
    points = Column(Integer, default=0)
    badges = Column(JSONB, default=list)
    streak_days = Column(Integer, default=0)
    last_activity_at = Column(DateTime(timezone=True))

    # Audit Fields (consistent with LabDefinition)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime(timezone=True))
    synced_at = Column(DateTime(timezone=True), default=datetime.utcnow)  # last Keycloak sync

    # Relationships
    instances = relationship(
        "LabInstance",
        foreign_keys="LabInstance.trainee_id",
        back_populates="user",
    )

    launched_instances = relationship(
        "LabInstance",
        foreign_keys="LabInstance.launched_by_user_id",
        back_populates="launched_by",
    )

    terminated_instances = relationship(
        "LabInstance",
        foreign_keys="LabInstance.terminated_by_user_id",
        back_populates="terminated_by",
    )

    # Composite index for common queries
    __table_args__ = (
        Index('ix_users_role_active', 'role', 'is_active'),
    )

    @property
    def full_name(self) -> str:
        """Return full name or fallback to username."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.username or self.email

    @property
    def display_name(self) -> str:
        """Return display name for UI."""
        return self.full_name or self.username or self.email

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
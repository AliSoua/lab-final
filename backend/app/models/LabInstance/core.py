# app/models/LabInstance/core.py
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, Enum, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.schemas.LabInstance.core import LabInstanceStatus


class LabInstance(Base):
    """
    Represents a running/scheduled instance of a lab definition for a specific user.

    Tracks provisioning state, resource allocation, user progress, and lifecycle.
    """
    __tablename__ = "lab_instancess"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Relationships
    lab_definition_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("lab_definitions.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )

    # Status & Lifecycle
    status = Column(
        Enum(LabInstanceStatus), 
        nullable=False, 
        default=LabInstanceStatus.SCHEDULED,
        index=True
    )
    status_message = Column(Text)  # Human-readable status details

    # Scheduling & Timing
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    scheduled_start_at = Column(DateTime(timezone=True))  # For delayed provisioning
    started_at = Column(DateTime(timezone=True))          # When VMs began provisioning
    ready_at = Column(DateTime(timezone=True))            # When user can access
    ended_at = Column(DateTime(timezone=True))            # When stopped/completed
    expires_at = Column(DateTime(timezone=True), index=True)  # Auto-cleanup deadline

    # Duration tracking (actual vs allocated)
    allocated_duration_minutes = Column(Integer, default=60)  # From LabDefinition
    actual_duration_minutes = Column(Integer, default=0)      # Calculated on completion
    extended_minutes = Column(Integer, default=0)             # Manual extensions

    # Progress Tracking
    current_step = Column(Integer, default=0)                 # Current guide step
    total_steps = Column(Integer, default=0)                  # Total guide blocks
    percent_complete = Column(Integer, default=0)             # 0-100
    last_activity_at = Column(DateTime(timezone=True))        # For auto-pause detection

    # Resource Allocation (JSONB for flexibility)
    resources = Column(JSONB, default=dict, nullable=False)
    # Example: {"network": {...}, "storage": {...}}

    # Access Information
    access_urls = Column(JSONB, default=dict, nullable=False)
    # Example: {"vnc": "...", "guacamole": "..."}

    credentials = Column(JSONB, default=dict, nullable=False)
    # Example: {"username": "...", "password_ref": "..."}

    # Error Handling
    error_code = Column(String(100))      # Machine-readable error type
    error_message = Column(Text)          # Detailed error description
    error_details = Column(JSONB, default=dict)  # Stack traces, logs refs

    # User Actions & Metadata
    terminated_by = Column(String(50))    # "user", "system", "admin"
    termination_reason = Column(Text)     # Why it was stopped
    user_notes = Column(Text)             # User's own notes about this session
    rating = Column(Integer)              # 1-5 star rating post-completion
    feedback = Column(Text)               # User feedback text

    # Cost & Resource Usage (optional tracking)
    estimated_cost = Column(Integer, default=0)
    actual_cost = Column(Integer, default=0)
    compute_seconds = Column(Integer, default=0)

    # Flags
    is_extendable = Column(Boolean, default=True)
    has_been_warned = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)

    # Relationships (using string references to avoid circular imports)
    lab_definition = relationship("LabDefinition", back_populates="instances")
    user = relationship("User", back_populates="instances")
    vms = relationship(
        "LabInstanceVM",
        back_populates="lab_instance",
        cascade="all, delete-orphan",
        order_by="LabInstanceVM.order"
    )
    events = relationship(
        "LabInstanceEvent",
        back_populates="lab_instance",
        cascade="all, delete-orphan",
        order_by="desc(LabInstanceEvent.timestamp)"
    )

    # Indexes for common queries
    __table_args__ = (
        Index('ix_lab_instancess_status_user', 'status', 'user_id'),
        Index('ix_lab_instancess_status_expires', 'status', 'expires_at'),
        Index('ix_lab_instancess_lab_def_status', 'lab_definition_id', 'status'),
    )

    @property
    def remaining_minutes(self) -> int:
        """Calculate remaining time based on expiry."""
        if not self.expires_at or self.status not in [LabInstanceStatus.RUNNING, LabInstanceStatus.PAUSED]:
            return 0
        remaining = (self.expires_at - datetime.utcnow()).total_seconds() / 60
        return max(0, int(remaining))

    @property
    def is_active(self) -> bool:
        """Check if instance is currently active (running or paused)."""
        return self.status in [LabInstanceStatus.RUNNING, LabInstanceStatus.PAUSED]

    @property
    def total_allocated_minutes(self) -> int:
        """Total time including extensions."""
        return (self.allocated_duration_minutes or 0) + (self.extended_minutes or 0)

    def __repr__(self):
        return f"<LabInstance(id={self.id}, status={self.status}, user={self.user_id})>"
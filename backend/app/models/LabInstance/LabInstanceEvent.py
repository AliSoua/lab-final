# app/models/LabInstance/LabInstanceEvent.py
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.LabInstance.core import LabInstance


class LabInstanceEvent(Base):
    """
    Audit log for lab instance lifecycle events.
    Immutable event sourcing for debugging and compliance.
    """
    __tablename__ = "lab_instance_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    lab_instance_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("lab_instances.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )

    # Event details
    event_type = Column(String(100), nullable=False, index=True)
    # Examples: "provision_start", "vm_ready", "user_connected", "error", "extension_granted"

    severity = Column(String(20), default="info")
    # Levels: debug, info, warning, error, critical

    message = Column(Text, nullable=False)

    # Metadata
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    source = Column(String(100))              # Service/component (e.g., "provisioner", "cleanup_job")
    event_metadata = Column(JSONB, default=dict)    # Additional structured data

    # Indexes for efficient querying
    __table_args__ = (
        Index('ix_lab_events_instance_timestamp', 'lab_instance_id', 'timestamp'),
        Index('ix_lab_events_type_timestamp', 'event_type', 'timestamp'),
    )

    # Relationship (actual reference back to LabInstance)
    lab_instance = relationship(LabInstance, back_populates="events")

    def __repr__(self):
        return f"<LabInstanceEvent(type={self.event_type}, time={self.timestamp})>"
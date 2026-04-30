# backend/app/models/LabInstance/LabInstanceEventLog.py
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class LabInstanceEventLog(Base):
    __tablename__ = "lab_instance_event_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    task_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lab_instance_tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    lab_instance_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lab_instances.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    event_type = Column(String(100), nullable=False)  # e.g. "clone_started", "power_on", "ip_discovered"
    message = Column(Text, nullable=False)
    metadata_ = Column("metadata", JSONB, nullable=True, default=dict)

    # ← FIX: timezone-aware + lambda (per-row evaluation)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    task = relationship("LabInstanceTask", back_populates="events")
    lab_instance = relationship("LabInstance", back_populates="event_logs")

    __table_args__ = (
        Index("ix_lab_instance_event_logs_task_created", "task_id", "created_at"),
        Index("ix_lab_instance_event_logs_instance_created", "lab_instance_id", "created_at"),
    )

    def __repr__(self):
        return (
            f"<LabInstanceEventLog(id={self.id}, task={self.task_id}, "
            f"type={self.event_type})>"
        )
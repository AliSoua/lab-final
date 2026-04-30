# backend/app/models/LabInstance/LabInstanceTask.py
import uuid
from datetime import datetime, timezone  # ← Added timezone

from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Index, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class LabInstanceTask(Base):
    __tablename__ = "lab_instance_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    lab_instance_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lab_instances.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    task_type = Column(String(100), nullable=False)  # e.g. "provision", "terminate", "monitoring.health_check"

    status = Column(
        String(50),
        nullable=False,
        default="queued",  # queued → running → completed / failed
    )

    # ── Timing ─────────────────────────────────────────────────────────────
    enqueued_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),  # ← FIX
    )
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # ── Worker attribution ─────────────────────────────────────────────────
    worker_pid = Column(Integer, nullable=True)
    worker_host = Column(String(255), nullable=True)

    # ── Error capture ────────────────────────────────────────────────────
    error_message = Column(Text, nullable=True)

    # ── Metadata for debugging ───────────────────────────────────────────
    metadata_ = Column("metadata", JSONB, nullable=True, default=dict)

    # Relationships
    lab_instance = relationship("LabInstance", back_populates="tasks")
    events = relationship(
        "LabInstanceEventLog",
        back_populates="task",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_lab_instance_tasks_instance_status", "lab_instance_id", "status"),
        Index("ix_lab_instance_tasks_status_enqueued", "status", "enqueued_at"),
    )

    def __repr__(self):
        return (
            f"<LabInstanceTask(id={self.id}, instance={self.lab_instance_id}, "
            f"type={self.task_type}, status={self.status})>"
        )
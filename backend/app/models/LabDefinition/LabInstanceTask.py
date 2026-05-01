# backend/app/models/LabInstance/LabInstanceTask.py
import uuid
from datetime import datetime, timezone

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

    task_type = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="queued")

    # ── NEW: Which launch/terminate stage this task handles ────────────────
    stage = Column(String(50), nullable=True)

    # ── NEW: Progress 0-100 for long-running stages ────────────────────────
    progress_percent = Column(Integer, nullable=True)

    enqueued_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    worker_pid = Column(Integer, nullable=True)
    worker_host = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
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
        Index("ix_lab_instance_tasks_stage", "stage", "status"),
    )

    def __repr__(self):
        return (
            f"<LabInstanceTask(id={self.id}, instance={self.lab_instance_id}, "
            f"type={self.task_type}, stage={self.stage}, status={self.status})>"
        )
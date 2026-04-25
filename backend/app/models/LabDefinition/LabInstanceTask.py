# backend/app/models/LabDefinition/LabInstanceTask.py
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


class LabInstanceTask(Base):
    __tablename__ = "lab_instance_tasks"

    # This UUID is reused as Celery's task_id (plan §3.4)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    lab_instance_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lab_instances.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    task_type = Column(String(50), nullable=False)          # "launch" | "terminate"
    status = Column(
        String(50),
        default="queued",
        nullable=False,                                     # queued | running | completed | failed
    )

    enqueued_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)

    worker_pid = Column(Integer, nullable=True)
    worker_host = Column(String(255), nullable=True)

    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

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
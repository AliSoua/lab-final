# app/models/LabDefinition/LabInstance.py
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.LabInstance.enums import InstanceStatus, PowerState
from sqlalchemy.orm import relationship
from app.db.base import Base


class LabInstance(Base):
    __tablename__ = "lab_instances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    lab_definition_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lab_definitions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    trainee_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    launched_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    guide_version_id = Column(
        UUID(as_uuid=True),
        ForeignKey("guide_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    vm_uuid = Column(String(255), nullable=True)
    vm_name = Column(String(255), nullable=True)
    vcenter_host = Column(String(255), nullable=True)
    
    # ── NEW: ESXi host where the VM is running ─────────────────────────────
    esxi_host = Column(String(255), nullable=True)

    # ── NEW: Unified status enum (string-backed) ───────────────────────────
    status = Column(
        String(50),
        default=InstanceStatus.PENDING.value,
        nullable=False,
    )
    
    # ── NEW: Unified power_state enum ──────────────────────────────────────
    power_state = Column(
        String(50),
        default=PowerState.UNKNOWN.value,
        nullable=False,
    )

    ip_address = Column(String(100))

    connection_url = Column(Text)
    guacamole_connection_id = Column(String(100), nullable=True, index=True)

    guacamole_connections = Column(
        JSONB,
        default=lambda: {},
        nullable=False,
        server_default="{}",
    )

    session_state = Column(
        JSONB,
        default=lambda: {
            "step_states": [],
            "total_score": 0,
            "max_score": 0,
            "status": "active",
        },
        nullable=False,
        server_default='{"step_states": [], "total_score": 0, "max_score": 0, "status": "active"}',
    )

    current_step_index = Column(Integer, default=0, nullable=False, server_default="0")

    # ── NEW: Launch stage tracking for resumability ────────────────────────
    launch_stage = Column(
        String(50),
        nullable=True,
        index=True,
    )

    # ── NEW: Termination metadata ──────────────────────────────────────────
    termination_reason = Column(String(50), nullable=True)
    terminated_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    failure_reason = Column(Text, nullable=True)
    cleanup_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    started_at = Column(DateTime(timezone=True), nullable=True)
    stopped_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # ── NEW: Auto-updating timestamp ───────────────────────────────────────
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    duration_minutes = Column(Integer, nullable=True)

    # Relationships — explicitly specify foreign_keys
    lab_definition = relationship("LabDefinition", back_populates="instances")

    user = relationship(
        "User",
        foreign_keys=[trainee_id],
        back_populates="instances",
    )

    launched_by = relationship(
        "User",
        foreign_keys=[launched_by_user_id],
        back_populates="launched_instances",
    )

    terminated_by = relationship(
        "User",
        foreign_keys=[terminated_by_user_id],
        back_populates="terminated_instances",
    )

    guide_version = relationship("GuideVersion", back_populates="instances")

    error_message = Column(Text, nullable=True)

    tasks = relationship(
        "LabInstanceTask",
        back_populates="lab_instance",
        cascade="all, delete-orphan",
    )
    event_logs = relationship(
        "LabInstanceEventLog",
        back_populates="lab_instance",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return (
            f"<LabInstance(id={self.id}, lab={self.lab_definition_id}, "
            f"trainee={self.trainee_id}, status={self.status}, "
            f"stage={self.launch_stage})>"
        )
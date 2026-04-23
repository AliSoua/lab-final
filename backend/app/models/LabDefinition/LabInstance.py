import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
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

    vm_uuid = Column(String(255), nullable=True)
    vm_name = Column(String(255), nullable=True)
    vcenter_host = Column(String(255), nullable=True)

    status = Column(String(50), default="provisioning", nullable=False)
    power_state = Column(String(50), default="unknown")
    ip_address = Column(String(100))

    # Legacy single-connection fields (kept for backward compatibility)
    connection_url = Column(Text)
    guacamole_connection_id = Column(String(100), nullable=True, index=True)

    # NEW: JSON mapping of all Guacamole connections per slot/protocol
    # Example: { "postgre-test_ssh": "1", "postgre-test_rdp": "2" }
    guacamole_connections = Column(
        JSONB,
        default=lambda: {},
        nullable=False,
        server_default="{}",
    )

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    started_at = Column(DateTime(timezone=True))
    stopped_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))

    # Relationships
    lab_definition = relationship("LabDefinition", back_populates="instances")
    user = relationship("User", back_populates="instances")

    def __repr__(self):
        return (
            f"<LabInstance(id={self.id}, lab={self.lab_definition_id}, "
            f"trainee={self.trainee_id}, status={self.status})>"
        )
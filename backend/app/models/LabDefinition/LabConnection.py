import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, String, DateTime, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base


class ConnectionProtocol(str, PyEnum):
    ssh = "ssh"
    rdp = "rdp"
    vnc = "vnc"


class LabConnection(Base):
    """Standalone transport layer configuration.
    
    Credentials live in Vault at:
        credentials/lab_connections/{slug}/{protocol}
    
    A single slug can have multiple protocols (ssh + rdp + vnc).
    """
    __tablename__ = "lab_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Logical grouping key — not tied to any lab or VM yet
    slug = Column(String(255), nullable=False, index=True)
    title = Column(String(255), nullable=False)

    protocol = Column(String(50), nullable=False, index=True)
    port = Column(Integer, nullable=False, default=22)

    # Non-sensitive protocol config (domain, security mode, color depth, etc.)
    config = Column(JSONB, default=dict, nullable=False)

    # Display order in UI pickers
    order = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        UniqueConstraint("slug", "protocol", name="uq_lab_connection_slug_protocol"),
    )

    def __repr__(self):
        return (
            f"<LabConnection(id={self.id}, slug={self.slug}, "
            f"protocol={self.protocol}, port={self.port})>"
        )
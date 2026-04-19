# app/models/LabDefinition/LabVM.py
import uuid

from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


class LabVM(Base):
    __tablename__ = "lab_vms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    lab_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lab_definitions.id", ondelete="CASCADE"),
        nullable=False
    )

    # The vCenter/ESXi VM to clone FROM (VM ID, inventory name, or UUID)
    source_vm_id = Column(String(255), nullable=False, index=True)
    # Examples:
    # vSphere: "vm-42", "ubuntu-22-template", "resgroup-123/ubuntu-22"
    # Proxmox: "local:vztmpl/ubuntu-22.04-standard..."

    # Display name inside this lab (matches guide step target_vm_name)
    name = Column(String(255), nullable=False)
    # e.g., "target-web", "attacker-kali", "ad-dc"

    # Optional: clone from a specific snapshot instead of current state
    snapshot_name = Column(String(255), nullable=True)

    # Minimal resource overrides (nullable = use template defaults)
    cpu_cores = Column(Integer, nullable=True)
    memory_mb = Column(Integer, nullable=True)

    # Display order in the lab builder
    order = Column(Integer, default=0, nullable=False)

    # Relationships
    lab = relationship("LabDefinition", back_populates="vms")

    def __repr__(self):
        return f"<LabVM(id={self.id}, name={self.name}, source={self.source_vm_id})>"
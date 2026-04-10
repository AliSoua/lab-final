# app/models/LabDefinition/LabVM.py
import uuid

from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class LabVM(Base):
    __tablename__ = "lab_vms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Relationships
    lab_id = Column(UUID(as_uuid=True), ForeignKey("lab_definitions.id"), nullable=False)
    vm_template_id = Column(UUID(as_uuid=True), ForeignKey("vm_templates.id"), nullable=False)

    # Lab-specific config
    name = Column(String(255), nullable=False)  # e.g. "web-server"
    order = Column(Integer, default=0)

    # Dynamic overrides
    config = Column(JSONB, default=dict)
    # Example:
    # {
    #   "cpu": 4,
    #   "ram": 8192,
    #   "network": "lab-net-1"
    # }

    # Relationships
    lab = relationship("LabDefinition", back_populates="vms")
    vm_template = relationship("VMTemplate", back_populates="lab_vms")

    def __repr__(self):
        return f"<LabVM(id={self.id}, name={self.name}, lab_id={self.lab_id})>"
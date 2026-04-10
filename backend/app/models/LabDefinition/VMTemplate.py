# app/models/LabDefinition/VMTemplate.py
import uuid

from sqlalchemy import Column, String, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


class VMTemplate(Base):
    __tablename__ = "vm_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Template Info
    name = Column(String(255), nullable=False)
    
    vsphere_template_name = Column(String(255), nullable=False)

    base_image = Column(String(255), nullable=False)  # e.g. ubuntu-22, win-server-2019

    # Default Resources
    cpu = Column(Integer, default=2)
    ram = Column(Integer, default=2048)  # MB
    disk = Column(Integer, default=20)   # GB

    # Reverse relationship
    lab_vms = relationship("LabVM", back_populates="vm_template")

    def __repr__(self):
        return f"<VMTemplate(id={self.id}, name={self.name})>"
# app/models/LabInstance/LabInstanceVM.py
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.LabInstance.core import LabInstance


class LabInstanceVM(Base):
    """
    Tracks actual provisioned VMs for a lab instance.
    Maps to LabVM definitions but represents real vCenter/ESXi VMs.
    """
    __tablename__ = "lab_instance_vms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Relationships
    lab_instance_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("lab_instancess.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    lab_vm_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("lab_vms.id"), 
        nullable=False
    )  # Reference to the LabVM definition

    # vCenter/ESXi specific identifiers
    vcenter_vm_id = Column(String(255), nullable=False)       # vCenter MoRef ID
    vcenter_instance_uuid = Column(String(255), unique=True)  # vCenter instance UUID
    esxi_host_id = Column(String(255))                        # Host running the VM
    datastore_id = Column(String(255))                        # Storage location

    # Networking
    ip_address = Column(INET)                                 # Primary IP
    mac_address = Column(String(17))                          # MAC (aa:bb:cc:dd:ee:ff)
    network_segment = Column(String(255))                     # Network/VLAN name

    # Resource specs (actual allocated)
    cpu_cores = Column(Integer)
    ram_mb = Column(Integer)
    disk_gb = Column(Integer)

    # State tracking
    vm_status = Column(String(50), default="poweredOn")       # poweredOn, poweredOff, suspended
    tools_status = Column(String(50))                         # VMware Tools status

    # Ordering (match LabVM order)
    order = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    powered_on_at = Column(DateTime(timezone=True))
    powered_off_at = Column(DateTime(timezone=True))

    # Access info specific to this VM
    console_url = Column(String(500))       # Direct console/VNC URL
    rdp_url = Column(String(500))           # RDP connection string
    ssh_host = Column(String(255))          # SSH accessible host
    ssh_port = Column(Integer, default=22)

    # Relationship (actual reference back to LabInstance)
    lab_instance = relationship(LabInstance, back_populates="vms")

    def __repr__(self):
        return f"<LabInstanceVM(id={self.id}, vcenter_id={self.vcenter_vm_id}, ip={self.ip_address})>"
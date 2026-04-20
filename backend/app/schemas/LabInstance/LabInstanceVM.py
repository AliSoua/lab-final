# app/schemas/LabInstance/LabInstanceVM.py
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from ipaddress import IPv4Address, IPv6Address

from pydantic import BaseModel, Field, field_validator


class LabInstanceVMBase(BaseModel):
    """Base schema for lab instance VMs."""
    lab_instance_id: UUID
    lab_vm_id: UUID = Field(..., description="Reference to LabVM definition")
    vcenter_vm_id: str = Field(..., max_length=255, description="vCenter MoRef ID")
    vcenter_instance_uuid: str = Field(..., max_length=255, description="vCenter instance UUID")


class LabInstanceVMCreate(BaseModel):
    """Schema for creating a lab instance VM record."""
    lab_vm_id: UUID
    vcenter_vm_id: str = Field(..., max_length=255)
    vcenter_instance_uuid: str = Field(..., max_length=255)
    esxi_host_id: Optional[str] = Field(None, max_length=255)
    datastore_id: Optional[str] = Field(None, max_length=255)
    ip_address: Optional[str] = Field(None, description="IP address (v4 or v6)")
    mac_address: Optional[str] = Field(None, pattern=r"^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$")
    network_segment: Optional[str] = Field(None, max_length=255)
    cpu_cores: Optional[int] = Field(None, ge=1)
    ram_mb: Optional[int] = Field(None, ge=128)
    disk_gb: Optional[int] = Field(None, ge=1)
    order: int = Field(0, description="Display/connection order")
    console_url: Optional[str] = Field(None, max_length=500)
    rdp_url: Optional[str] = Field(None, max_length=500)
    ssh_host: Optional[str] = Field(None, max_length=255)
    ssh_port: int = Field(22, ge=1, le=65535)


class LabInstanceVMUpdate(BaseModel):
    """Schema for updating a lab instance VM (state changes)."""
    ip_address: Optional[str] = None
    mac_address: Optional[str] = Field(None, pattern=r"^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$")
    vm_status: Optional[str] = Field(None, pattern="^(poweredOn|poweredOff|suspended)$")
    tools_status: Optional[str] = None
    powered_on_at: Optional[datetime] = None
    powered_off_at: Optional[datetime] = None
    console_url: Optional[str] = Field(None, max_length=500)
    rdp_url: Optional[str] = Field(None, max_length=500)
    ssh_host: Optional[str] = Field(None, max_length=255)
    ssh_port: Optional[int] = Field(None, ge=1, le=65535)


class LabInstanceVMResponse(LabInstanceVMBase):
    """Response schema for lab instance VMs."""
    id: UUID

    # vCenter Info
    esxi_host_id: Optional[str] = None
    datastore_id: Optional[str] = None

    # Network
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    network_segment: Optional[str] = None

    # Resources
    cpu_cores: Optional[int] = None
    ram_mb: Optional[int] = None
    disk_gb: Optional[int] = None

    # State
    vm_status: str = Field(default="poweredOn")
    tools_status: Optional[str] = None
    order: int = Field(default=0)

    # Timestamps
    created_at: datetime
    powered_on_at: Optional[datetime] = None
    powered_off_at: Optional[datetime] = None

    # Access
    console_url: Optional[str] = None
    rdp_url: Optional[str] = None
    ssh_host: Optional[str] = None
    ssh_port: int = Field(default=22)

    # Joined fields from LabVM definition (optional)
    name: Optional[str] = Field(None, description="VM name from LabVM definition")
    source_vm_id: Optional[str] = Field(None, description="Template ID from LabVM")

    class Config:
        from_attributes = True

    @field_validator('ip_address', mode='before')
    @classmethod
    def validate_ip(cls, v):
        if v is None:
            return None
        if isinstance(v, (IPv4Address, IPv6Address)):
            return str(v)
        return v
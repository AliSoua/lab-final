# app/schemas/LabDefinition/LabVM.py
from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


# BASE

class LabVMBase(BaseModel):
    lab_id: UUID
    vm_template_id: str = Field(..., max_length=255, description="External vCenter/ESXi template ID")
    name: str = Field(..., max_length=255)  # instance name in lab
    order: int = 0
    config: Dict[str, Any] = Field(default_factory=dict)
    # Stores: cpu_cores, memory_mb, disk_gb, network_config, startup_delay


# CREATE

class LabVMCreate(LabVMBase):
    pass


# UPDATE

class LabVMUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    order: Optional[int] = None
    vm_template_id: Optional[str] = Field(None, max_length=255)
    config: Optional[Dict[str, Any]] = None


class LabVMResponse(LabVMBase):
    id: UUID
    
    # Flattened config fields for convenience
    cpu_cores: Optional[int] = None
    memory_mb: Optional[int] = None
    disk_gb: Optional[int] = None
    startup_delay: Optional[int] = None
    network_config: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        """Flatten config dict into individual fields"""
        return cls(
            id=obj.id,
            lab_id=obj.lab_id,
            vm_template_id=obj.vm_template_id,
            name=obj.name,
            order=obj.order,
            config=obj.config or {},
            cpu_cores=obj.config.get("cpu_cores") if obj.config else None,
            memory_mb=obj.config.get("memory_mb") if obj.config else None,
            disk_gb=obj.config.get("disk_gb") if obj.config else None,
            startup_delay=obj.config.get("startup_delay") if obj.config else None,
            network_config=obj.config.get("network_config") if obj.config else None,
        )
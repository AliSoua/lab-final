from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class LabVMBase(BaseModel):
    source_vm_id: str = Field(
        ...,
        max_length=255,
        description="vCenter/ESXi VM ID or MOID to clone from (e.g., 'vm-42')"
    )
    name: str = Field(
        ...,
        max_length=255,
        description="Display name in the lab (e.g., 'target-web', 'attacker-kali')"
    )
    snapshot_name: Optional[str] = Field(
        None,
        description="Snapshot name to create a linked clone from"
    )
    esxi_vault_path: Optional[str] = Field(
        None,
        max_length=500,
        description="Vault path to moderator ESXi credentials (e.g., 'credentials/moderators/{mod_id}/{host}')"
    )
    esxi_host: Optional[str] = Field(
        None,
        max_length=255,
        description="Cached ESXi host address for UI display"
    )
    cpu_cores: Optional[int] = Field(None, ge=1, description="Override CPU cores")
    memory_mb: Optional[int] = Field(None, ge=512, description="Override RAM in MB")
    order: int = Field(0, ge=0)


class LabVMCreate(LabVMBase):
    pass


class LabVMUpdate(BaseModel):
    source_vm_id: Optional[str] = Field(None, max_length=255)
    name: Optional[str] = Field(None, max_length=255)
    snapshot_name: Optional[str] = None
    esxi_vault_path: Optional[str] = Field(None, max_length=500)
    esxi_host: Optional[str] = Field(None, max_length=255)
    cpu_cores: Optional[int] = Field(None, ge=1)
    memory_mb: Optional[int] = Field(None, ge=512)
    order: Optional[int] = None


class LabVMResponse(LabVMBase):
    id: UUID
    lab_id: UUID

    model_config = ConfigDict(from_attributes=True)
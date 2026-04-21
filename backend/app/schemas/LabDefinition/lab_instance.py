# app/schemas/LabDefinition/lab_instance.py
import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class LabInstanceCreate(BaseModel):
    lab_definition_id: uuid.UUID = Field(
        ..., description="UUID of the lab definition to launch"
    )


class LabInstanceResponse(BaseModel):
    id: uuid.UUID
    lab_definition_id: uuid.UUID
    trainee_id: uuid.UUID
    vm_uuid: Optional[str] = None
    vm_name: Optional[str] = None
    vcenter_host: Optional[str] = None
    status: str
    power_state: Optional[str] = None
    ip_address: Optional[str] = None
    connection_url: Optional[str] = None
    created_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LabInstanceListResponse(BaseModel):
    items: List[LabInstanceResponse]
    total: int


class LabInstanceStatusResponse(BaseModel):
    id: uuid.UUID
    status: str
    power_state: Optional[str] = None
    ip_address: Optional[str] = None
    vm_name: Optional[str] = None
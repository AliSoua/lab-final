# backend/app/schemas/LabDefinition/LabInstanceEvent.py
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class LabInstanceEventLogResponse(BaseModel):
    id: UUID
    task_id: UUID
    lab_instance_id: UUID
    event_type: str
    event_code: Optional[str] = None
    source: Optional[str] = None
    severity: Optional[str] = None
    message: str
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, alias="metadata_")
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class LabInstanceEventLogListResponse(BaseModel):
    items: list[LabInstanceEventLogResponse]
    total: int
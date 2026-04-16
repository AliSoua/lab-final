# app/schemas/LabInstance/LabInstanceEvent.py
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, Field


class LabInstanceEventBase(BaseModel):
    """Base schema for lab instance events."""
    lab_instance_id: UUID
    event_type: str = Field(..., max_length=100, description="Event type identifier")
    severity: str = Field(default="info", pattern="^(debug|info|warning|error|critical)$")
    message: str = Field(..., description="Human-readable event message")
    source: Optional[str] = Field(None, max_length=100, description="Component/service that generated the event")
    event_metadata: Dict[str, Any] = Field(default_factory=dict, description="Structured event data")


class LabInstanceEventCreate(BaseModel):
    """Schema for creating a lab instance event."""
    event_type: str = Field(..., max_length=100, description="Event type: provision_start, vm_ready, error, etc.")
    severity: str = Field(default="info", pattern="^(debug|info|warning|error|critical)$")
    message: str = Field(..., description="Event description")
    source: Optional[str] = Field(None, max_length=100)
    event_metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: Optional[datetime] = Field(None, description="Override timestamp (defaults to now)")

    class Config:
        json_schema_extra = {
            "example": {
                "event_type": "vm_ready",
                "severity": "info",
                "message": "Web server VM provisioned successfully",
                "source": "provisioner",
                "event_metadata": {
                    "vm_id": "550e8400-e29b-41d4-a716-446655440000",
                    "ip_address": "10.0.1.5",
                    "host": "esxi-01"
                }
            }
        }


class LabInstanceEventResponse(LabInstanceEventBase):
    """Response schema for lab instance events."""
    id: UUID
    timestamp: datetime

    class Config:
        from_attributes = True


class LabInstanceEventQuery(BaseModel):
    """Query parameters for listing events."""
    event_type: Optional[str] = Field(None, description="Filter by event type")
    severity: Optional[str] = Field(None, pattern="^(debug|info|warning|error|critical)$")
    source: Optional[str] = Field(None, description="Filter by source component")
    from_date: Optional[datetime] = Field(None, description="Filter events from this date")
    to_date: Optional[datetime] = Field(None, description="Filter events to this date")
    limit: int = Field(100, ge=1, le=1000)

    class Config:
        json_schema_extra = {
            "example": {
                "severity": "error",
                "from_date": "2026-04-01T00:00:00",
                "limit": 50
            }
        }


class LabInstanceEventSummary(BaseModel):
    """Summary of events for an instance (for dashboards)."""
    total_events: int
    errors_count: int
    warnings_count: int
    last_event_at: Optional[datetime] = None
    last_event_type: Optional[str] = None
    last_event_message: Optional[str] = None
    recent_errors: List[LabInstanceEventResponse] = Field(default_factory=list)
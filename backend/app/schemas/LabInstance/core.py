# app/schemas/LabInstance/core.py
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, Field


class LabInstanceStatus(str, Enum):
    """Lifecycle states for a lab instance."""
    SCHEDULED = "scheduled"
    PROVISIONING = "provisioning"
    CONFIGURING = "configuring"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPING = "stopping"
    COMPLETED = "completed"
    EXPIRED = "expired"
    FAILED = "failed"
    ARCHIVED = "archived"


class LabInstanceBase(BaseModel):
    """Base schema for lab instances."""
    lab_definition_id: UUID
    status: LabInstanceStatus = LabInstanceStatus.SCHEDULED
    status_message: Optional[str] = None


class LabInstanceCreate(BaseModel):
    """Schema for creating a new lab instance."""
    lab_definition_id: UUID = Field(..., description="ID of the lab definition to instantiate")
    scheduled_start_at: Optional[datetime] = Field(None, description="Delay provisioning until this time")
    user_notes: Optional[str] = Field(None, max_length=1000, description="User's notes for this session")

    class Config:
        json_schema_extra = {
            "example": {
                "lab_definition_id": "550e8400-e29b-41d4-a716-446655440000",
                "user_notes": "Working on advanced networking exercise"
            }
        }


class LabInstanceUpdate(BaseModel):
    """Schema for updating a lab instance (user actions)."""
    status: Optional[LabInstanceStatus] = Field(None, description="Change instance status")
    current_step: Optional[int] = Field(None, ge=0, description="Update current guide step")
    percent_complete: Optional[int] = Field(None, ge=0, le=100, description="Overall completion percentage")
    user_notes: Optional[str] = Field(None, max_length=1000)
    rating: Optional[int] = Field(None, ge=1, le=5, description="User rating 1-5")
    feedback: Optional[str] = Field(None, max_length=2000)
    is_pinned: Optional[bool] = Field(None, description="Pin to dashboard")


class LabInstanceResponse(LabInstanceBase):
    """Full response schema for a lab instance."""
    id: UUID
    user_id: UUID

    # Status
    status: LabInstanceStatus
    status_message: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None

    # Timing
    created_at: datetime
    scheduled_start_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    ready_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    # Duration
    allocated_duration_minutes: int = Field(default=60)
    actual_duration_minutes: int = Field(default=0)
    extended_minutes: int = Field(default=0)
    remaining_minutes: int = Field(default=0, description="Calculated remaining time")

    # Progress
    current_step: int = Field(default=0)
    total_steps: int = Field(default=0)
    percent_complete: int = Field(default=0)
    last_activity_at: Optional[datetime] = None

    # Resources & Access
    resources: Dict[str, Any] = Field(default_factory=dict)
    access_urls: Dict[str, Any] = Field(default_factory=dict)

    # Metadata
    terminated_by: Optional[str] = None
    termination_reason: Optional[str] = None
    user_notes: Optional[str] = None
    rating: Optional[int] = None
    feedback: Optional[str] = None

    # Flags
    is_extendable: bool = Field(default=True)
    is_pinned: bool = Field(default=False)
    is_active: bool = Field(default=False, description="Whether instance is running or paused")

    # Cost/Usage (optional)
    estimated_cost: int = Field(default=0)
    actual_cost: int = Field(default=0)
    compute_seconds: int = Field(default=0)

    # Nested data (optional, populated on demand)
    vms: Optional[List["LabInstanceVMResponse"]] = None
    events: Optional[List["LabInstanceEventResponse"]] = None

    class Config:
        from_attributes = True


class LabInstanceSummary(BaseModel):
    """Lightweight summary for lists/dashboards."""
    id: UUID
    lab_definition_id: UUID
    status: LabInstanceStatus
    name: str = Field(..., description="Lab definition name (joined)")
    slug: str = Field(..., description="Lab definition slug")
    thumbnail_url: Optional[str] = None
    percent_complete: int
    remaining_minutes: int
    is_pinned: bool
    created_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LabInstanceListParams(BaseModel):
    """Query parameters for listing lab instances."""
    status: Optional[LabInstanceStatus] = Field(None, description="Filter by status")
    is_active: Optional[bool] = Field(None, description="Filter active instances (running/paused)")
    search: Optional[str] = Field(None, description="Search lab name/description")
    sort_by: str = Field("created_at", pattern="^(created_at|status|expires_at|percent_complete)$")
    sort_order: str = Field("desc", pattern="^(asc|desc)$")
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)

    class Config:
        json_schema_extra = {
            "example": {
                "status": "running",
                "is_active": True,
                "sort_by": "created_at",
                "sort_order": "desc",
                "page": 1,
                "page_size": 20
            }
        }


# For circular reference resolution
from app.schemas.LabInstance.LabInstanceVM import LabInstanceVMResponse
from app.schemas.LabInstance.LabInstanceEvent import LabInstanceEventResponse

LabInstanceResponse.model_rebuild()
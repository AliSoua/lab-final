# app/schemas/LabDefinition/lab_instance.py
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator

from app.schemas.LabDefinition.lab_runtime import LabGuideSessionState


class LabInstanceCreate(BaseModel):
    lab_definition_id: uuid.UUID = Field(
        ..., description="UUID of the lab definition to launch"
    )


class LabInstanceResponse(BaseModel):
    id: uuid.UUID
    lab_definition_id: uuid.UUID
    trainee_id: uuid.UUID

    # ── NEW: Snapshot of the guide version active at launch time ────────────
    guide_version_id: Optional[uuid.UUID] = Field(
        None,
        description="Pinned guide version. Copied from LabDefinition at launch.",
    )

    vm_uuid: Optional[str] = None
    vm_name: Optional[str] = None
    vcenter_host: Optional[str] = None

    status: str
    power_state: Optional[str] = None
    ip_address: Optional[str] = None

    # Legacy single-connection fields
    connection_url: Optional[str] = None
    guacamole_connection_id: Optional[str] = None

    # Mapping of all active Guacamole connections
    guacamole_connections: Optional[Dict[str, str]] = Field(
        default_factory=dict,
        description="All Guacamole connections keyed as 'slug_protocol'",
    )

    # ── NEW: Runtime session state (step progress, scores, results) ─────────
    session_state: Optional[LabGuideSessionState] = Field(
        default=None,
        description="Mutable runtime state: step completions, command results, scores.",
    )

    # ── NEW: Current step index persisted server-side ───────────────────────
    current_step_index: int = Field(
        default=0,
        description="Trainee's current position in the guide (0-based).",
    )

    created_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    duration_minutes: Optional[int] = Field(
        None,
        description="Copied from LabDefinition at launch. Used to compute expires_at.",
    )
    
    esxi_host: Optional[str] = Field(None, description="ESXi host running the VM")
    launch_stage: Optional[str] = None
    termination_reason: Optional[str] = None
    failure_reason: Optional[str] = None
    terminated_by_user_id: Optional[uuid.UUID] = None
    launched_by_user_id: Optional[uuid.UUID] = None
    cleanup_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

    @field_validator("guacamole_connections", mode="before")
    @classmethod
    def normalize_empty_connections(cls, v):
        """Handle DB returning [] or None instead of {}."""
        if v is None or v == []:
            return {}
        return v


class LabInstanceListResponse(BaseModel):
    items: List[LabInstanceResponse]
    total: int


class LabInstanceStatusResponse(BaseModel):
    id: uuid.UUID
    status: str
    power_state: Optional[str] = None
    ip_address: Optional[str] = None
    vm_name: Optional[str] = None

    # ── NEW: Lightweight runtime fields for polling ─────────────────────────
    current_step_index: int = Field(default=0)
    session_state_status: Optional[str] = Field(
        None,
        description="Derived from session_state.status for quick polling.",
    )

# TRAINEE RESPONSES

class LabDefinitionSummary(BaseModel):
    id: uuid.UUID
    name: str
    difficulty: Optional[str] = None
    category: Optional[str] = None
    track: Optional[str] = None

    class Config:
        from_attributes = True


class MyLabInstanceSummary(BaseModel):
    id: uuid.UUID
    lab_definition: LabDefinitionSummary

    status: str
    power_state: Optional[str] = None

    # Timing info the trainee actually cares about
    created_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None

    # Computed convenience field
    time_remaining_minutes: Optional[int] = Field(
        None,
        description="Minutes left until expiration. Null if not started or no expiry.",
    )

    # Progress
    current_step_index: int = 0

    class Config:
        from_attributes = True


class MyLabInstanceListResponse(BaseModel):
    items: List[MyLabInstanceSummary]
    total: int
# app/schemas/LabDefinition/lab_runtime.py
from typing import Optional, List, Dict
from uuid import UUID
from enum import Enum
from datetime import datetime

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════════
#  RUNTIME CONTEXT
# ═══════════════════════════════════════════════════════════════════════════════

class VMInstanceMapping(BaseModel):
    vm_name: str
    instance_id: Optional[str] = None
    ip_address: Optional[str] = None
    hostname: Optional[str] = None
    status: str = Field(
        default="provisioning",
        description="provisioning | running | stopped | error",
    )


class LabGuideRuntimeContext(BaseModel):
    session_id: str
    lab_definition_id: str
    guide_version_id: str
    user_id: str
    vm_mappings: List[VMInstanceMapping] = Field(default_factory=list)
    default_vm: Optional[str] = None
    started_at: str
    expires_at: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
#  COMMAND EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

class CommandExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    TIMEOUT = "timeout"


class CommandExecutionResult(BaseModel):
    command_index: int
    status: CommandExecutionStatus
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    exit_code: Optional[int] = None
    executed_at: Optional[str] = None
    completed_at: Optional[str] = None
    resolved_target: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
#  VALIDATION EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

class ValidationExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"


class ValidationExecutionResult(BaseModel):
    validation_index: int
    status: ValidationExecutionStatus
    message: Optional[str] = None
    actual_output: Optional[str] = None
    executed_at: Optional[str] = None
    resolved_target: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
#  QUIZ & STEP STATE
# ═══════════════════════════════════════════════════════════════════════════════

class QuizSubmission(BaseModel):
    answer: str
    submitted_at: str
    is_correct: bool
    attempts: int


class StepExecutionState(BaseModel):
    step_id: str
    status: str = Field(
        default="locked",
        description="locked | available | in_progress | completed | failed",
    )
    quiz_result: Optional[QuizSubmission] = None
    tasks_completed: List[int] = Field(default_factory=list)
    hints_revealed: List[int] = Field(default_factory=list)
    command_results: List[CommandExecutionResult] = Field(default_factory=list)
    validation_results: List[ValidationExecutionResult] = Field(default_factory=list)
    score_earned: int = Field(default=0, ge=0)
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
#  SESSION STATE (Top-level object stored in LabInstance.session_state JSONB)
# ═══════════════════════════════════════════════════════════════════════════════

class LabGuideSessionState(BaseModel):
    runtime_context: Optional[LabGuideRuntimeContext] = None
    step_states: List[StepExecutionState] = Field(default_factory=list)
    total_score: int = Field(default=0, ge=0)
    max_score: int = Field(default=0, ge=0)
    status: str = Field(
        default="active",
        description="active | paused | completed | abandoned",
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  TRAINEE RUNTIME RESPONSE — Stripped-down view for Run Lab UI
# ═══════════════════════════════════════════════════════════════════════════════

class LabInstanceRuntimeResponse(BaseModel):
    """
    Stripped-down runtime view for the trainee Run Lab UI.
    Contains only what's needed to connect to Guacamole and track progress.
    Intentionally excludes: vm_uuid, vcenter_host, trainee_id, ip_address,
    internal routing, credentials, and other infrastructure-sensitive fields.
    """
    id: UUID
    status: str
    power_state: Optional[str] = None

    # Connection info — only what's needed to build Guacamole client URLs
    guacamole_connection_id: Optional[str] = None
    guacamole_connections: Optional[Dict[str, str]] = Field(default_factory=dict)

    # Progress
    current_step_index: int = 0
    session_state_status: Optional[str] = None  # "active" | "completed" | etc.

    # Timing
    time_remaining_minutes: Optional[int] = None
    expires_at: Optional[datetime] = None

    # Lab metadata (denormalized for convenience)
    lab_name: Optional[str] = None
    lab_definition_id: Optional[UUID] = None

    error_message: Optional[str] = None

    class Config:
        from_attributes = True
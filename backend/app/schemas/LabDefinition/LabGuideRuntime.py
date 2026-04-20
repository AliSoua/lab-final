# app/schemas/LabDefinition/LabGuideRuntime.py
from typing import Optional, List, Dict, Any, Literal
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


class VMInstanceMapping(BaseModel):
    """Maps a VM role (from LabDefinition) to an actual running instance."""
    vm_name: str                          # e.g., "attacker-vm" (from LabDefinition)
    instance_id: Optional[str] = None     # Proxmox UUID / AWS instance ID
    ip_address: Optional[str] = None
    hostname: Optional[str] = None
    status: Literal["provisioning", "running", "stopped", "error"] = "provisioning"


class LabGuideRuntimeContext(BaseModel):
    """
    Injected at session start.
    Binds a static guide to live infrastructure for one user session.
    """
    session_id: UUID
    lab_definition_id: UUID
    guide_id: UUID
    user_id: str
    vm_mappings: List[VMInstanceMapping] = Field(default_factory=list)
    default_vm: Optional[str] = None      # Fallback if command/validation has no target
    started_at: datetime
    expires_at: Optional[datetime] = None


# ── Execution Results ────────────────────────────────────────────────────────

class CommandExecutionResult(BaseModel):
    command_index: int                    # Index in step.commands[]
    status: Literal["pending", "running", "success", "failed", "timeout"]
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    exit_code: Optional[int] = None
    executed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    resolved_target: Optional[str] = None # Actual VM name/IP used


class ValidationExecutionResult(BaseModel):
    validation_index: int
    status: Literal["pending", "running", "passed", "failed", "error"]
    message: Optional[str] = None
    actual_output: Optional[str] = None
    executed_at: Optional[datetime] = None
    resolved_target: Optional[str] = None


class QuizSubmission(BaseModel):
    answer: str
    submitted_at: datetime
    is_correct: bool
    attempts: int = 1


# ── Step Session State ───────────────────────────────────────────────────────

class StepExecutionState(BaseModel):
    step_id: UUID
    status: Literal["locked", "available", "in_progress", "completed", "failed"]

    # Assessment
    quiz_result: Optional[QuizSubmission] = None
    tasks_completed: List[int] = Field(default_factory=list)  # Indices of completed tasks
    hints_revealed: List[int] = Field(default_factory=list)   # Levels revealed

    # Execution
    command_results: List[CommandExecutionResult] = Field(default_factory=list)

    # Validation
    validation_results: List[ValidationExecutionResult] = Field(default_factory=list)

    score_earned: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# ── Full Session State ───────────────────────────────────────────────────────

class LabGuideSessionState(BaseModel):
    runtime_context: LabGuideRuntimeContext
    step_states: List[StepExecutionState]
    total_score: int = 0
    max_score: int = 0
    status: Literal["active", "paused", "completed", "abandoned"]

    model_config = ConfigDict(from_attributes=True)


# ── API Payloads ─────────────────────────────────────────────────────────────

class StartGuideSessionRequest(BaseModel):
    lab_definition_id: UUID
    guide_id: UUID


class RevealHintRequest(BaseModel):
    step_id: UUID
    hint_level: int = Field(..., ge=1, le=3)


class SubmitQuizRequest(BaseModel):
    step_id: UUID
    answer: str


class ExecuteCommandRequest(BaseModel):
    step_id: UUID
    command_index: int


class RunValidationsRequest(BaseModel):
    step_id: UUID
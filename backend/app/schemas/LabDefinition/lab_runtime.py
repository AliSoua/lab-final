# app/schemas/LabDefinition/lab_runtime.py
from typing import Optional, List
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
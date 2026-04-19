# app/schemas/LabDefinition/LabGuide.py
from typing import Optional, List, Dict, Any
from uuid import UUID
from enum import Enum
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


# ── Nested Content Block Schemas ─────────────────────────────────────────────

class GuideCommand(BaseModel):
    label: str = Field(..., max_length=255, description="Display name: 'Scan ports'")
    command: str = Field(..., description="The actual shell command")
    description: Optional[str] = Field(None, description="What this command does")
    timeout: int = Field(300, ge=1, le=3600)
    sudo: bool = False
    working_directory: Optional[str] = "/home/user"


class GuideTask(BaseModel):
    description: str = Field(..., description="e.g., 'Find the open ports'")
    is_required: bool = True  # Must complete to finish step


class GuideHint(BaseModel):
    level: int = Field(..., ge=1, le=3, description="1=vague, 2=specific, 3=almost solution")
    content: str = Field(..., description="Hint text/markdown")


class ValidationCheckType(str, Enum):
    PORT_OPEN = "port_open"
    PORT_CLOSED = "port_closed"
    FILE_EXISTS = "file_exists"
    FILE_CONTENT = "file_content"
    COMMAND_OUTPUT = "command_output"
    USER_HAS_ROOT = "user_has_root"
    SERVICE_RUNNING = "service_running"
    PROCESS_RUNNING = "process_running"
    PING_REACHABLE = "ping_reachable"
    CUSTOM_SCRIPT = "custom_script"


class ValidationCheck(BaseModel):
    type: ValidationCheckType
    description: str = Field(..., description="Human-readable: 'Check SSH is open'")
    target_vm_name: Optional[str] = Field(None, description="Defaults to step's target_vm_name")

    # Type-specific args
    target_host: Optional[str] = None      # IP/hostname for port/ping checks
    port: Optional[int] = Field(None, ge=1, le=65535)
    file_path: Optional[str] = None
    expected_content: Optional[str] = None  # Substring or regex for file/command output
    command: Optional[str] = None           # Command to run for command_output/custom_script
    expected_output_pattern: Optional[str] = None  # Regex pattern
    user: Optional[str] = None              # For user_has_root
    timeout: int = Field(30, ge=1, le=300)

    is_blocking: bool = False  # Must pass before advancing to next step
    points: int = Field(0, ge=0, description="Points awarded for passing")


class QuizType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    SHORT_ANSWER = "short_answer"
    FLAG = "flag"


class GuideQuiz(BaseModel):
    question: str
    type: QuizType
    description: Optional[str] = None

    # For multiple choice
    options: Optional[List[str]] = Field(None, description="['21', '22', '80', '443']")
    correct_answer: str = Field(..., description="Correct value or option text")

    case_sensitive: bool = False
    flag_format_hint: Optional[str] = Field(None, description="e.g., 'FLAG{...}'")
    points: int = Field(10, ge=0)


# ── Step Schemas ─────────────────────────────────────────────────────────────

class LabGuideStepBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    target_vm_name: Optional[str] = Field(
        None,
        description="Which LabVM.name this step targets for commands/validations"
    )

    theory_content: Optional[str] = Field(None, description="Markdown/HTML explanation")
    commands: List[GuideCommand] = Field(default_factory=list)
    tasks: List[GuideTask] = Field(default_factory=list)
    hints: List[GuideHint] = Field(default_factory=list)
    validations: List[ValidationCheck] = Field(default_factory=list)
    quiz: Optional[GuideQuiz] = None
    points: int = Field(10, ge=0, description="Points for completing this step")
    order: int = Field(0, ge=0, description="Display order within the guide")


class LabGuideStepCreate(LabGuideStepBase):
    pass


class LabGuideStepUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_vm_name: Optional[str] = None
    theory_content: Optional[str] = None
    commands: Optional[List[GuideCommand]] = None
    tasks: Optional[List[GuideTask]] = None
    hints: Optional[List[GuideHint]] = None
    validations: Optional[List[ValidationCheck]] = None
    quiz: Optional[GuideQuiz] = None
    points: Optional[int] = None


class LabGuideStepResponse(LabGuideStepBase):
    id: UUID
    guide_id: UUID

    model_config = ConfigDict(from_attributes=True)


# ── Guide Schemas ────────────────────────────────────────────────────────────

class LabGuideBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = "beginner"
    estimated_duration_minutes: int = Field(30, ge=1)
    tags: List[str] = Field(default_factory=list)
    is_published: bool = False


class LabGuideCreate(LabGuideBase):
    steps: List[LabGuideStepCreate] = Field(default_factory=list)
    created_by: Optional[str] = Field(None, description="Injected from JWT")


class LabGuideUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    tags: Optional[List[str]] = None
    is_published: Optional[bool] = None
    steps: Optional[List[LabGuideStepCreate]] = None
    updated_by: Optional[str] = Field(None, description="Injected from JWT")


class LabGuideResponse(LabGuideBase):
    id: UUID
    created_by: str
    created_at: datetime
    updated_at: datetime
    updated_by: Optional[str] = None
    steps: List[LabGuideStepResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class LabGuideListItem(BaseModel):
    """Lightweight response for catalog listings"""
    id: UUID
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    estimated_duration_minutes: int
    tags: List[str] = Field(default_factory=list)
    is_published: bool
    created_at: datetime
    step_count: int = Field(0, description="Number of steps")

    model_config = ConfigDict(from_attributes=True)


class LabGuideAssignRequest(BaseModel):
    """Request body to assign a guide to a lab definition"""
    guide_id: UUID
# app/schemas/LabDefinition/LabGuide.py
from typing import Optional, List, Dict, Any
from uuid import UUID
from enum import Enum
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict, field_validator


# ═══════════════════════════════════════════════════════════════════════════════
#  EXECUTION TARGET
# ═══════════════════════════════════════════════════════════════════════════════

class ExecutionTarget(BaseModel):
    vm_name: Optional[str] = Field(
        None,
        description="References LabVM.name in the LabDefinition. Runtime maps this to an actual instance."
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  CONTENT BLOCKS
# ═══════════════════════════════════════════════════════════════════════════════

class GuideTask(BaseModel):
    description: str = Field(..., description="What the learner must do")
    is_required: bool = True


class GuideHint(BaseModel):
    level: int = Field(..., ge=1, le=3, description="1=vague, 2=specific, 3=almost solution")
    content: str = Field(..., description="Hint text / markdown")


# ═══════════════════════════════════════════════════════════════════════════════
#  EXECUTION BLOCKS
# ═══════════════════════════════════════════════════════════════════════════════

class GuideCommand(BaseModel):
    label: str = Field(..., max_length=255, description="Display name: 'Scan ports'")
    command: str = Field(..., description="The actual shell command")
    description: Optional[str] = Field(None, description="What this command does")
    timeout: int = Field(300, ge=1, le=3600)
    sudo: bool = False
    working_directory: Optional[str] = "/home/user"
    target: Optional[ExecutionTarget] = Field(
        None,
        description="VM target. If None, runtime resolves from session context."
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  ASSESSMENT BLOCKS
# ═══════════════════════════════════════════════════════════════════════════════

class QuizType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    SHORT_ANSWER = "short_answer"
    FLAG = "flag"


class GuideQuiz(BaseModel):
    question: str
    type: QuizType
    description: Optional[str] = None
    options: Optional[List[str]] = Field(None, description="For multiple_choice")
    correct_answer: str = Field(..., description="Correct value or option text")
    case_sensitive: bool = False
    flag_format_hint: Optional[str] = Field(None, description="e.g., 'FLAG{...}'")
    points: int = Field(10, ge=0)


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
    target: Optional[ExecutionTarget] = Field(
        None,
        description="VM to run check against. If None, check runs from the grading controller."
    )
    target_host: Optional[str] = None
    port: Optional[int] = Field(None, ge=1, le=65535)
    file_path: Optional[str] = None
    expected_content: Optional[str] = None
    command: Optional[str] = None
    expected_output_pattern: Optional[str] = None
    user: Optional[str] = None
    timeout: int = Field(30, ge=1, le=300)
    is_blocking: bool = False
    points: int = Field(0, ge=0)


# ═══════════════════════════════════════════════════════════════════════════════
#  STEP SCHEMAS (Input for building versions)
# ═══════════════════════════════════════════════════════════════════════════════

class LabGuideStepBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    theory_content: Optional[str] = Field(
        None, 
        max_length=50_000,  # generous limit for long guides
        description="Markdown content. Limited HTML allowed for tables/iframe embeds."
    )
    commands: List[GuideCommand] = Field(default_factory=list)
    tasks: List[GuideTask] = Field(default_factory=list)
    hints: List[GuideHint] = Field(default_factory=list)
    validations: List[ValidationCheck] = Field(default_factory=list)
    quiz: Optional[GuideQuiz] = None
    points: int = Field(10, ge=0, description="Points for completing this step")
    order: int = Field(0, ge=0, description="Display order within the guide")
    
    @field_validator('theory_content')
    @classmethod
    def validate_content_length(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 50_000:
            raise ValueError("Theory content exceeds 50,000 characters")
        return v


class LabGuideStepCreate(LabGuideStepBase):
    pass


class LabGuideStepUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
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


# ═══════════════════════════════════════════════════════════════════════════════
#  GUIDE VERSION SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class GuideVersionBase(BaseModel):
    is_published: bool = False


class GuideVersionCreate(BaseModel):
    steps: List[LabGuideStepCreate] = Field(default_factory=list)
    is_published: bool = False


class GuideVersionResponse(BaseModel):
    id: UUID
    guide_id: UUID
    version_number: int
    created_by: str
    created_at: datetime
    is_published: bool
    published_at: Optional[datetime] = None
    steps: List[Dict[str, Any]] = Field(default_factory=list)
    step_count: int = Field(0, description="Number of steps in this version")

    model_config = ConfigDict(from_attributes=True)


class GuideVersionListItem(BaseModel):
    id: UUID
    version_number: int
    is_published: bool
    created_at: datetime
    step_count: int

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
#  GUIDE (LOGICAL) SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class LabGuideBase(BaseModel):
    title: str = Field(..., max_length=255)


class LabGuideCreate(LabGuideBase):
    """Create a new logical guide. Optionally create first version inline."""
    initial_steps: Optional[List[LabGuideStepCreate]] = Field(
        default=None,
        description="If provided, creates version 1 immediately"
    )
    is_published: bool = False


class LabGuideUpdate(BaseModel):
    title: Optional[str] = None


class LabGuideResponse(LabGuideBase):
    id: UUID
    created_by: str
    created_at: datetime
    updated_at: datetime
    updated_by: Optional[str] = None
    current_version: Optional[GuideVersionResponse] = None
    current_version_id: Optional[UUID] = None
    total_versions: int = Field(0, description="Total number of versions")

    model_config = ConfigDict(from_attributes=True)


class LabGuideListItem(BaseModel):
    id: UUID
    title: str
    current_version_id: Optional[UUID] = None
    current_version_number: Optional[int] = None
    current_version_published: Optional[bool] = None
    created_at: datetime
    step_count: int = Field(0, description="Steps in current version")

    model_config = ConfigDict(from_attributes=True)


class LabGuideAssignRequest(BaseModel):
    guide_version_id: UUID = Field(..., description="Specific version to assign to lab")
# app/schemas/LabInstance/__init__.py
from app.schemas.LabInstance.core import (
    LabInstanceStatus,
    LabInstanceBase,
    LabInstanceCreate,
    LabInstanceUpdate,
    LabInstanceResponse,
    LabInstanceSummary,
    LabInstanceListParams
)
from app.schemas.LabInstance.LabInstanceVM import (
    LabInstanceVMBase,
    LabInstanceVMCreate,
    LabInstanceVMUpdate,
    LabInstanceVMResponse
)
from app.schemas.LabInstance.LabInstanceEvent import (
    LabInstanceEventBase,
    LabInstanceEventCreate,
    LabInstanceEventResponse,
    LabInstanceEventQuery
)

__all__ = [
    # Core
    "LabInstanceStatus",
    "LabInstanceBase",
    "LabInstanceCreate",
    "LabInstanceUpdate", 
    "LabInstanceResponse",
    "LabInstanceSummary",
    "LabInstanceListParams",
    # VM
    "LabInstanceVMBase",
    "LabInstanceVMCreate",
    "LabInstanceVMUpdate",
    "LabInstanceVMResponse",
    # Event
    "LabInstanceEventBase",
    "LabInstanceEventCreate",
    "LabInstanceEventResponse",
    "LabInstanceEventQuery"
]
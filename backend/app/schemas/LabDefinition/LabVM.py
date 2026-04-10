from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


# BASE

class LabVMBase(BaseModel):
    lab_id: UUID
    vm_template_id: UUID

    name: str = Field(..., max_length=255)  # instance name in lab
    order: int = 0

    config: Dict[str, Any] = Field(default_factory=dict)
    # Example:
    # {
    #   "cpu": 4,
    #   "ram": 8192,
    #   "network": "lab-net-1"
    # }


# CREATE

class LabVMCreate(LabVMBase):
    pass


# UPDATE

class LabVMUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    order: Optional[int] = None

    config: Optional[Dict[str, Any]] = None


# RESPONSE

class LabVMResponse(LabVMBase):
    id: UUID

    class Config:
        from_attributes = True
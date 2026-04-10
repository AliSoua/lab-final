# app/schemas/LabDefinition/VMTemplate.py
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# BASE

class VMTemplateBase(BaseModel):
    name: str = Field(..., max_length=255)

    vsphere_template_name: str = Field(..., max_length=255)

    base_image: str = Field(..., max_length=255)

    cpu: int = Field(2, ge=1)
    ram: int = Field(2048, ge=128)
    disk: int = Field(20, ge=1)


# CREATE

class VMTemplateCreate(VMTemplateBase):
    pass


# UPDATE

class VMTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    vsphere_template_name: Optional[str] = Field(None, max_length=255)
    base_image: Optional[str] = Field(None, max_length=255)

    cpu: Optional[int] = Field(None, ge=1)
    ram: Optional[int] = Field(None, ge=128)
    disk: Optional[int] = Field(None, ge=1)


# RESPONSE

class VMTemplateResponse(VMTemplateBase):
    id: UUID

    class Config:
        from_attributes = True
# app/schemas/LabDefinition/core.py
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ENUMS

class LabStatus(str, Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class LabDifficulty(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


# BASE SCHEMA

class LabDefinitionBase(BaseModel):
    slug: str = Field(..., max_length=255)
    name: str = Field(..., max_length=255)
    description: str
    short_description: Optional[str] = Field(None, max_length=500)

    status: LabStatus = LabStatus.draft

    duration_minutes: int = Field(60, ge=1)
    max_concurrent_users: int = Field(1, ge=1)
    cooldown_minutes: int = Field(0, ge=0)

    difficulty: LabDifficulty = LabDifficulty.beginner
    category: Optional[str] = Field(None, max_length=100)
    track: Optional[str] = Field(None, max_length=100)

    thumbnail_url: Optional[str] = Field(None, max_length=500)


# CREATE SCHEMA

class LabDefinitionCreate(LabDefinitionBase):
    created_by: str


# UPDATE SCHEMA

class LabDefinitionUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    short_description: Optional[str] = Field(None, max_length=500)

    status: Optional[LabStatus] = None

    duration_minutes: Optional[int] = Field(None, ge=1)
    max_concurrent_users: Optional[int] = Field(None, ge=1)
    cooldown_minutes: Optional[int] = Field(None, ge=0)

    difficulty: Optional[LabDifficulty] = None
    category: Optional[str] = Field(None, max_length=100)
    track: Optional[str] = Field(None, max_length=100)

    thumbnail_url: Optional[str] = Field(None, max_length=500)

    updated_by: Optional[str] = None


# RESPONSE SCHEMA

class LabDefinitionResponse(LabDefinitionBase):
    id: UUID

    created_by: str
    created_at: datetime

    updated_by: Optional[str]
    updated_at: datetime

    published_at: Optional[datetime]

    class Config:
        from_attributes = True  # Pydantic v2 ORM mode
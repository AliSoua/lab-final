# app/schemas/LabDefinition/full_lab.py
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.schemas.LabDefinition.LabVM import LabVMResponse, LabVMCreate
from app.schemas.LabDefinition.LabGuide import LabGuideStepCreate, LabGuideResponse
from app.schemas.LabDefinition.LabConnection import LabConnectionSlot
from app.schemas.LabDefinition.core import (
    LabCategory, LabDifficulty, LabStatus, InfrastructureProvider
)


class FullLabDefinitionCreate(BaseModel):
    """Create a complete lab with VMs, Connection Slots and optionally a guide."""
    name: str
    slug: str
    short_description: Optional[str] = None
    description: Optional[str] = None
    category: Optional[LabCategory] = LabCategory.other
    difficulty: Optional[LabDifficulty] = LabDifficulty.beginner
    duration_minutes: Optional[int] = Field(120, ge=1)
    max_concurrent_users: Optional[int] = Field(1, ge=1)
    track: Optional[str] = None
    thumbnail_url: Optional[str] = None
    cooldown_minutes: Optional[int] = Field(0, ge=0)
    status: Optional[LabStatus] = LabStatus.draft
    objectives: Optional[List[str]] = Field(default_factory=list)
    prerequisites: Optional[List[str]] = Field(default_factory=list)
    tags: Optional[List[str]] = Field(default_factory=list)

    infrastructure_provider: Optional[InfrastructureProvider] = InfrastructureProvider.vsphere

    # Featured
    is_featured: Optional[bool] = Field(default=False)
    featured_priority: Optional[int] = Field(default=0, ge=0)

    # VMs to clone
    vms: List[LabVMCreate] = Field(default_factory=list)

    # Connection slots (reference existing connections by slug + protocol flags)
    connections: List[LabConnectionSlot] = Field(default_factory=list)

    # Guide version 
    guide_version_id: Optional[UUID] = Field(None, description="Assign existing guide version")


class FullLabDefinitionResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    category: Optional[LabCategory] = None
    difficulty: Optional[LabDifficulty] = None
    status: LabStatus
    duration_minutes: int
    max_concurrent_users: int
    cooldown_minutes: int
    track: Optional[str] = None
    thumbnail_url: Optional[str] = None

    objectives: List[str] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)

    infrastructure_provider: InfrastructureProvider

    is_featured: bool = False
    featured_priority: int = 0

    vms: List[LabVMResponse] = Field(default_factory=list)
    connection_slots: List[LabConnectionSlot] = Field(
        default_factory=list,
        description="Assigned connection slots (slug + enabled protocols)"
    )
    guide_version_id: Optional[UUID] = None

    created_at: datetime
    created_by: Optional[str] = None
    updated_at: datetime
    updated_by: Optional[str] = None
    published_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
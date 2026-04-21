# app/schemas/LabDefinition/core.py
from datetime import datetime
from enum import Enum
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class LabStatus(str, Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class LabDifficulty(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class LabCategory(str, Enum):
    networking = "networking"
    security = "security"
    cloud = "cloud"
    devops = "devops"
    system_admin = "system_admin"
    database = "database"
    programming = "programming"
    data_science = "data_science"
    web_development = "web_development"
    other = "other"


class InfrastructureProvider(str, Enum):
    vsphere = "vsphere"
    proxmox = "proxmox"


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
    category: LabCategory = LabCategory.other
    track: Optional[str] = Field(None, max_length=100)

    thumbnail_url: Optional[str] = Field(None, max_length=500)

    objectives: List[str] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)

    infrastructure_provider: InfrastructureProvider = InfrastructureProvider.vsphere


class LabDefinitionCreate(LabDefinitionBase):
    guide_version_id: Optional[UUID] = Field(
        None,
        description="Assign an existing published guide version"
    )
    created_by: Optional[str] = Field(
        default=None,
        description="Keycloak user ID (sub claim) - injected by API"
    )


class LabDefinitionUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    short_description: Optional[str] = Field(None, max_length=500)

    status: Optional[LabStatus] = None

    duration_minutes: Optional[int] = Field(None, ge=1)
    max_concurrent_users: Optional[int] = Field(None, ge=1)
    cooldown_minutes: Optional[int] = Field(None, ge=0)

    difficulty: Optional[LabDifficulty] = None
    category: Optional[LabCategory] = None
    track: Optional[str] = Field(None, max_length=100)

    thumbnail_url: Optional[str] = Field(None, max_length=500)

    objectives: Optional[List[str]] = None
    prerequisites: Optional[List[str]] = None
    tags: Optional[List[str]] = None

    infrastructure_provider: Optional[InfrastructureProvider] = None
    guide_version_id: Optional[UUID] = Field(
        None,
        description="Change or remove assigned guide version"
    )

    updated_by: Optional[str] = Field(
        default=None,
        description="Keycloak user ID (sub claim) - injected by API"
    )


class FeatureLabDefinition(BaseModel):
    is_featured: bool
    featured_priority: int = 0
    updated_by: Optional[str] = Field(
        default=None,
        description="Keycloak user ID (sub claim) - injected by API"
    )


class LabDefinitionResponse(LabDefinitionBase):
    id: UUID
    is_featured: bool = False
    featured_priority: int = 0
    created_by: str
    created_at: datetime
    updated_by: Optional[str] = None
    updated_at: datetime
    published_at: Optional[datetime] = None
    guide_version_id: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)


class PublicLabDefinitionResponse(BaseModel):
    id: UUID
    slug: str
    name: str
    description: str
    short_description: Optional[str] = None
    status: LabStatus
    duration_minutes: int
    max_concurrent_users: int
    difficulty: LabDifficulty
    category: LabCategory
    track: Optional[str] = None
    thumbnail_url: Optional[str] = None
    objectives: List[str] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    infrastructure_provider: InfrastructureProvider = InfrastructureProvider.vsphere
    guide_version_id: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)


class LabDefinitionFilter(BaseModel):
    category: Optional[LabCategory] = None
    difficulty: Optional[LabDifficulty] = None
    status: Optional[LabStatus] = None
    track: Optional[str] = None
    created_by: Optional[str] = None
    infrastructure_provider: Optional[InfrastructureProvider] = None
    has_guide_version: Optional[bool] = Field(
        None,
        description="Filter labs that have a guide version assigned"
    )
    search: Optional[str] = Field(None, description="Search in name, description, or slug")
    tag: Optional[str] = Field(None, description="Filter by specific tag")
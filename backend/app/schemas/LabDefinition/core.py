# app/schemas/LabDefinition/core.py

from datetime import datetime
from enum import Enum
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# =============================================================================
# ENUMS
# =============================================================================

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


# =============================================================================
# BASE SCHEMA
# =============================================================================

class LabDefinitionBase(BaseModel):
    slug: str = Field(..., max_length=255, description="URL-friendly identifier")
    name: str = Field(..., max_length=255, description="Display name of the lab")
    description: str = Field(..., description="Full markdown/HTML description")
    short_description: Optional[str] = Field(
        None, 
        max_length=500, 
        description="Brief summary for cards/previews"
    )

    status: LabStatus = Field(
        default=LabStatus.draft,
        description="Publication status of the lab"
    )

    # Configuration
    duration_minutes: int = Field(
        default=60, 
        ge=1, 
        description="Estimated time to complete"
    )
    max_concurrent_users: int = Field(
        default=1, 
        ge=1, 
        description="Max simultaneous lab instances"
    )
    cooldown_minutes: int = Field(
        default=0, 
        ge=0, 
        description="Cooldown between attempts"
    )

    # Classification
    difficulty: LabDifficulty = Field(
        default=LabDifficulty.beginner,
        description="Skill level required"
    )
    category: LabCategory = Field(
        default=LabCategory.other,
        description="Primary category"
    )
    track: Optional[str] = Field(
        None, 
        max_length=100,
        description="Learning track/collection name"
    )

    # Media
    thumbnail_url: Optional[str] = Field(
        None, 
        max_length=500,
        description="URL to lab thumbnail image"
    )

    # Learning Content
    objectives: List[str] = Field(
        default_factory=list,
        description="Learning objectives for this lab"
    )
    prerequisites: List[str] = Field(
        default_factory=list,
        description="Prerequisites needed before starting"
    )
    tags: List[str] = Field(
        default_factory=list,
        description="Searchable tags for categorization"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "slug": "network-security-basics",
                "name": "Network Security Basics",
                "description": "Learn fundamental network security concepts...",
                "short_description": "Introduction to firewalls and VLANs",
                "status": "draft",
                "duration_minutes": 90,
                "max_concurrent_users": 5,
                "cooldown_minutes": 30,
                "difficulty": "beginner",
                "category": "security",
                "track": "CCNA Security",
                "objectives": ["Configure firewalls", "Understand VLANs"],
                "prerequisites": ["Basic networking knowledge"],
                "tags": ["security", "networking", "firewall"]
            }
        }
    )


# =============================================================================
# CREATE SCHEMA
# =============================================================================

class LabDefinitionCreate(BaseModel):
    """
    Schema for creating a new lab definition.
    
    Note: created_by is injected from Keycloak token (sub claim) by the router.
    """
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

    # Learning Content
    objectives: List[str] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)

    # Injected by API
    created_by: Optional[str] = Field(
        default=None,
        description="Keycloak user ID (sub claim) - injected by API"
    )


# =============================================================================
# UPDATE SCHEMA
# =============================================================================

class FeatureLabDefinition(BaseModel):
    is_featured: bool
    featured_priority: int = 0
    updated_by: Optional[str] = Field(
        default=None,
        description="Keycloak user ID (sub claim) - injected by API"
    )

class LabDefinitionUpdate(BaseModel):
    """
    Schema for updating an existing lab.
    
    Note: updated_by is injected from Keycloak token (sub claim) by the router.
    """
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

    # Learning Content - Added
    objectives: Optional[List[str]] = Field(
        default=None,
        description="Learning objectives for this lab"
    )
    prerequisites: Optional[List[str]] = Field(
        default=None,
        description="Prerequisites needed before starting"
    )
    tags: Optional[List[str]] = Field(
        default=None,
        description="Searchable tags for categorization"
    )

    # This is set by the router from JWT token - not required in request
    updated_by: Optional[str] = Field(
        default=None,
        description="Keycloak user ID (sub claim) - injected by API"
    )


# =============================================================================
# RESPONSE SCHEMA
# =============================================================================

class LabDefinitionResponse(BaseModel):
    """Complete lab definition response including audit fields"""
    id: UUID
    
    # Core fields
    slug: str
    name: str
    description: str
    short_description: Optional[str]

    status: LabStatus
    
    # Configuration
    duration_minutes: int
    max_concurrent_users: int
    cooldown_minutes: int

    # Classification
    difficulty: LabDifficulty
    category: LabCategory
    track: Optional[str]

    thumbnail_url: Optional[str]

    # Learning Content
    objectives: List[str] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)

    # Featured fields
    is_featured: bool = Field(default=False, description="Whether this lab is featured in hero section")
    featured_priority: int = Field(default=0, description="Display priority for featured labs")

    # Audit fields
    created_by: str = Field(...)
    created_at: datetime
    
    updated_by: Optional[str] = Field(None)
    updated_at: datetime

    published_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class PublicLabDefinitionResponse(BaseModel):
    """Public lab definition response - excludes audit fields and internal metadata"""
    id: UUID
    
    # Core fields
    slug: str
    name: str
    description: str
    short_description: Optional[str] = None

    status: LabStatus
    
    # Configuration - user-facing only
    duration_minutes: int
    max_concurrent_users: int

    # Classification
    difficulty: LabDifficulty
    category: LabCategory
    track: Optional[str] = None

    thumbnail_url: Optional[str] = None

    # Learning Content - Added for public catalog
    objectives: List[str] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# ADDITIONAL FILTER/QUERY SCHEMAS
# =============================================================================

class LabDefinitionFilter(BaseModel):
    """Query parameters for filtering lab listings"""
    category: Optional[LabCategory] = None
    difficulty: Optional[LabDifficulty] = None
    status: Optional[LabStatus] = None
    track: Optional[str] = None
    created_by: Optional[str] = None
    search: Optional[str] = Field(
        None, 
        description="Search in name, description, or slug"
    )
    # New filter options
    tag: Optional[str] = Field(
        None,
        description="Filter by specific tag"
    )
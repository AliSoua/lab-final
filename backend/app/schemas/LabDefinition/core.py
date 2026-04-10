# app/schemas/LabDefinition/core.py

from datetime import datetime
from enum import Enum
from typing import Optional
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
    """Predefined lab categories for consistent classification"""
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
        description="Primary category (now enforced as enum)"
    )
    track: Optional[str] = Field(
        None, 
        max_length=100,
        description="Learning track/collection name (e.g., 'CCNA', 'Security+')"
    )

    # Media
    thumbnail_url: Optional[str] = Field(
        None, 
        max_length=500,
        description="URL to lab thumbnail image"
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
                "track": "CCNA Security"
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
    Do not send this in the request body - it will be overwritten.
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
    category: LabCategory = LabCategory.other  # Now required as enum
    track: Optional[str] = Field(None, max_length=100)

    thumbnail_url: Optional[str] = Field(None, max_length=500)

    # This is set by the router from JWT token - not required in request
    created_by: Optional[str] = Field(
        default=None,
        description="Keycloak user ID (sub claim) - injected by API"
    )


# =============================================================================
# UPDATE SCHEMA
# =============================================================================

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
    category: Optional[LabCategory] = None  # Changed to enum
    track: Optional[str] = Field(None, max_length=100)

    thumbnail_url: Optional[str] = Field(None, max_length=500)

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
    category: LabCategory  # Now returns as enum string
    track: Optional[str]

    thumbnail_url: Optional[str]

    # Audit fields - Keycloak user IDs (sub claims)
    created_by: str = Field(
        ...,
        description="Keycloak User ID (sub) who created this lab"
    )
    created_at: datetime
    
    updated_by: Optional[str] = Field(
        None,
        description="Keycloak User ID (sub) who last updated this lab"
    )
    updated_at: datetime

    published_at: Optional[datetime]

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
    created_by: Optional[str] = None  # Filter by Keycloak user ID
    search: Optional[str] = Field(
        None, 
        description="Search in name, description, or slug"
    )
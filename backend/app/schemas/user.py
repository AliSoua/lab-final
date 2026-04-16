# app/schemas/user.py
"""
Pydantic schemas for User model.
Follows v2 patterns with ConfigDict(from_attributes=True).
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ==============================================================================
# Nested Models
# ==============================================================================

class Certification(BaseModel):
    """User certification entry."""
    model_config = ConfigDict(from_attributes=True)
    
    name: str
    issued_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    url: Optional[str] = None


class Badge(BaseModel):
    """User badge for gamification."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    icon: str
    earned_at: datetime


class UserPreferences(BaseModel):
    """User preference settings."""
    model_config = ConfigDict(from_attributes=True)
    
    theme: str = "light"
    notifications: bool = True
    language: str = "en"
    email_digest: bool = True


# ==============================================================================
# Base Schemas
# ==============================================================================

class UserBase(BaseModel):
    """Base user fields (read-only from Keycloak)."""
    model_config = ConfigDict(from_attributes=True)
    
    email: str  # Using str instead of EmailStr to allow internal domains like .test, .local
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str = "trainee"
    is_active: bool = True


class UserProfileBase(BaseModel):
    """Editable profile fields."""
    model_config = ConfigDict(from_attributes=True)
    
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=2000)
    job_title: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    timezone: str = "UTC"


class UserPlatformStats(BaseModel):
    """Platform statistics (auto-calculated)."""
    model_config = ConfigDict(from_attributes=True)
    
    total_labs_completed: int = 0
    total_labs_in_progress: int = 0
    total_time_spent_minutes: int = 0
    skill_level: str = "beginner"
    points: int = 0
    streak_days: int = 0


# ==============================================================================
# Response Schemas
# ==============================================================================

class UserResponse(UserBase, UserProfileBase, UserPlatformStats):
    """
    Full user response.
    Returned by GET /profile/me
    """
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    keycloak_id: str
    certifications: List[Certification] = []
    badges: List[Badge] = []
    preferences: UserPreferences
    last_activity_at: Optional[datetime] = None
    created_at: datetime
    last_login_at: Optional[datetime] = None
    synced_at: datetime


class UserStatsResponse(BaseModel):
    """Quick stats for dashboard widgets."""
    model_config = ConfigDict(from_attributes=True)
    
    labs_completed: int
    labs_in_progress: int
    total_time_hours: int
    skill_level: str
    points: int
    streak_days: int
    badges_count: int
    certifications_count: int


class UserListItem(BaseModel):
    """User item for admin user lists."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    email: str
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    is_active: bool
    skill_level: str
    total_labs_completed: int
    created_at: datetime
    last_login_at: Optional[datetime] = None


# ==============================================================================
# Request Schemas (for updates)
# ==============================================================================

class UserProfileUpdate(BaseModel):
    """
    Profile update request.
    Only editable fields allowed.
    """
    avatar_url: Optional[str] = Field(None, max_length=500)
    bio: Optional[str] = Field(None, max_length=2000)
    job_title: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    timezone: Optional[str] = None
    preferences: Optional[UserPreferences] = None


class UserStatsUpdate(BaseModel):
    """
    Stats update (for internal platform use).
    Called when lab is completed, etc.
    """
    total_labs_completed: Optional[int] = None
    total_labs_in_progress: Optional[int] = None
    total_time_spent_minutes: Optional[int] = None
    skill_level: Optional[str] = None
    points: Optional[int] = None
    streak_days: Optional[int] = None
    last_activity_at: Optional[datetime] = None


class BadgeGrant(BaseModel):
    """Grant badge to user."""
    id: str
    name: str
    icon: str


# ==============================================================================
# Sync Schemas (Keycloak integration)
# ==============================================================================

class UserSyncRequest(BaseModel):
    """
    Request to sync user from Keycloak.
    Called on login or manual sync.
    
    Note: Using str for email instead of EmailStr to allow internal/test domains
    like .test, .local, .internal, etc. that Keycloak may use.
    """
    keycloak_id: str
    email: str  # Changed from EmailStr to str to allow internal domains
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str = "trainee"
    
    @field_validator('email')
    @classmethod
    def validate_email_not_empty(cls, v: str) -> str:
        if not v or '@' not in v:
            raise ValueError('Invalid email format')
        return v.lower()
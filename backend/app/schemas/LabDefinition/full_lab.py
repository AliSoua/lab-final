# app/schemas/LabDefinition/full_lab.py
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.schemas.LabDefinition.LabVM import LabVMResponse
from app.schemas.LabDefinition.LabGuideBlock import LabGuideBlockCreate, LabGuideBlockResponse


class LabVMItemCreate(BaseModel):
    """VM configuration within a full lab creation request"""
    name: str
    description: Optional[str] = None  # Kept for schema but not stored in DB
    vm_template_id: str = Field(..., max_length=255, description="External vCenter/ESXi template ID")
    cpu_cores: Optional[int] = 2
    memory_mb: Optional[int] = 4096
    disk_gb: Optional[int] = 50
    network_config: Optional[dict] = None
    startup_delay: Optional[int] = 0
    order: Optional[int] = None


class FullLabDefinitionCreate(BaseModel):
    """Complete lab definition creation payload including VM configurations and guide blocks."""
    name: str
    slug: str
    short_description: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    duration_minutes: Optional[int] = 120
    max_concurrent_users: Optional[int] = 1
    track: Optional[str] = None
    thumbnail_url: Optional[str] = None
    cooldown_minutes: Optional[int] = 0
    status: Optional[str] = "draft"
    objectives: Optional[List[str]] = Field(default_factory=list)
    prerequisites: Optional[List[str]] = Field(default_factory=list)
    network_profile_id: Optional[UUID] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    vms: List[LabVMItemCreate] = []
    guide_blocks: List[LabGuideBlockCreate] = []
    
    # Featured fields - defaults for creation
    is_featured: Optional[bool] = Field(default=False, description="Whether this lab appears in featured section")
    featured_priority: Optional[int] = Field(default=0, description="Priority order for featured labs (lower = first)")


class FullLabDefinitionResponse(BaseModel):
    """Response after creating or retrieving full lab definition with VMs and guide"""
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    status: str
    
    # Learning Content
    objectives: List[str] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    
    # Featured fields in response
    is_featured: bool = Field(default=False)
    featured_priority: int = Field(default=0)
    
    vms: List[LabVMResponse]
    guide_blocks: List[LabGuideBlockResponse]
    created_at: datetime
    created_by: Optional[str] = None
    
    class Config:
        from_attributes = True
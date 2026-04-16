# app/schemas/LabDefinition/LabGuideBlock.py

from typing import Optional, Dict, Any
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field


class GuideBlockType(str, Enum):
    TEXT = "text"
    CMD = "cmd"


class LabGuideBlockBase(BaseModel):
    """Base schema for guide blocks"""
    block_type: GuideBlockType = Field(..., description="Type of block: 'text' or 'cmd'")
    content: str = Field(..., description="Markdown text for TEXT, command string for CMD")
    title: Optional[str] = Field(None, max_length=255, description="Optional title for the block")
    order: int = Field(0, description="Display order within the guide")
    block_metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional config (timeout, sudo, etc.)")


class LabGuideBlockCreate(LabGuideBlockBase):
    """Schema for creating a guide block"""
    pass


class LabGuideBlockUpdate(BaseModel):
    """Schema for updating a guide block"""
    block_type: Optional[GuideBlockType] = None
    content: Optional[str] = None
    title: Optional[str] = Field(None, max_length=255)
    order: Optional[int] = None
    block_metadata: Optional[Dict[str, Any]] = None


class LabGuideBlockResponse(LabGuideBlockBase):
    """Response schema for guide blocks"""
    id: UUID
    lab_id: UUID

    class Config:
        from_attributes = True


# Helper schemas for specific block types
class TextBlockMetadata(BaseModel):
    """Metadata specific to TEXT blocks"""
    syntax_highlighting: Optional[str] = None  # e.g., "python", "bash"
    collapsible: bool = False
    collapsed_by_default: bool = False


class CmdBlockMetadata(BaseModel):
    """Metadata specific to CMD blocks"""
    working_directory: Optional[str] = "/home/user"
    timeout: int = 300  # seconds
    sudo: bool = False
    expect_output: Optional[str] = None  # Expected output pattern for validation
    confirmation_required: bool = False  # Require user confirmation before execution
    description: Optional[str] = None  # Description of what the command does
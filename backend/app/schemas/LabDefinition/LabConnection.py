# app/schemas/LabDefinition/LabConnection.py
import re
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict, field_validator


class ConnectionProtocol(str, Enum):
    ssh = "ssh"
    rdp = "rdp"
    vnc = "vnc"


class LabConnectionBase(BaseModel):
    slug: str = Field(
        ...,
        max_length=255,
        description="Logical slug for grouping (e.g., 'router-lab-01')",
    )
    title: str = Field(
        ...,
        max_length=255,
        description="Display name shown to trainees (e.g., 'SSH Terminal')",
    )
    protocol: ConnectionProtocol = Field(...)
    port: int = Field(..., ge=1, le=65535)
    config: Dict[str, Any] = Field(default_factory=dict)
    order: int = Field(0, ge=0, description="Display order in the lab UI")

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        v = v.strip().lower()
        if not v:
            raise ValueError("Slug cannot be empty")
        if not re.match(r'^[a-z0-9]+(?:[._-][a-z0-9]+)*$', v):
            raise ValueError(
                "Slug must be lowercase alphanumeric with hyphens, dots, or underscores only"
            )
        if ".." in v:
            raise ValueError("Slug cannot contain consecutive dots")
        return v

    @field_validator("config", mode="before")
    @classmethod
    def set_default_config(cls, v: Optional[Dict[str, Any]], info) -> Dict[str, Any]:
        if v is not None and len(v) > 0:
            return v
        protocol = info.data.get("protocol") if hasattr(info, "data") else None
        if protocol == ConnectionProtocol.ssh:
            return {"auth_type": "password"}
        elif protocol == ConnectionProtocol.rdp:
            return {"domain": "", "security": "nla", "ignore_cert": True}
        elif protocol == ConnectionProtocol.vnc:
            return {"color_depth": "24", "swap_red_blue": False}
        return {}


class LabConnectionCreate(LabConnectionBase):
    """Requires credentials to be stored in Vault alongside the DB record."""
    username: str = Field(..., max_length=255, description="Username stored in Vault")
    password: str = Field(..., min_length=1, description="Password stored in Vault")


class LabConnectionUpdate(BaseModel):
    """Partial update. Protocol is IMMUTABLE — delete + recreate to change."""
    slug: Optional[str] = Field(None, max_length=255)
    title: Optional[str] = Field(None, max_length=255)
    # protocol: EXCLUDED — changing protocol creates Vault orphans
    port: Optional[int] = Field(None, ge=1, le=65535)
    config: Optional[Dict[str, Any]] = None
    order: Optional[int] = Field(None, ge=0)
    username: Optional[str] = Field(None, max_length=255)
    password: Optional[str] = Field(None, min_length=1)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip().lower()
        if not v:
            raise ValueError("Slug cannot be empty")
        if not re.match(r'^[a-z0-9]+(?:[._-][a-z0-9]+)*$', v):
            raise ValueError(
                "Slug must be lowercase alphanumeric with hyphens, dots, or underscores only"
            )
        if ".." in v:
            raise ValueError("Slug cannot contain consecutive dots")
        return v


class LabConnectionResponse(LabConnectionBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LabConnectionListItem(BaseModel):
    """Lightweight item for list views."""
    id: UUID
    slug: str
    title: str
    protocol: ConnectionProtocol
    port: int
    order: int

    model_config = ConfigDict(from_attributes=True)


class LabConnectionDetailResponse(LabConnectionResponse):
    """Full detail including Vault metadata. Password is NEVER returned."""
    vault_path: str = Field(..., description="Resolved Vault path for this connection")
    username: Optional[str] = Field(None, description="Username read from Vault")


class LabConnectionGroupedResponse(BaseModel):
    """Connections grouped by slug for the protocol-slot UI."""
    slug: str
    connections: List[LabConnectionListItem]

    model_config = ConfigDict(from_attributes=True)


# ── NEW: Slot schema for Lab Definition assignment ──

class LabConnectionSlot(BaseModel):
    """Selected connection slot assigned to a Lab Definition.
    
    References an existing connection group by slug and declares
    which protocols are enabled for this lab.
    """
    slug: str = Field(..., description="Existing LabConnection slug")
    ssh: bool = Field(default=False, description="Enable SSH protocol for this lab")
    rdp: bool = Field(default=False, description="Enable RDP protocol for this lab")
    vnc: bool = Field(default=False, description="Enable VNC protocol for this lab")

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        v = v.strip().lower()
        if not v:
            raise ValueError("Slug cannot be empty")
        if not re.match(r'^[a-z0-9]+(?:[._-][a-z0-9]+)*$', v):
            raise ValueError(
                "Slug must be lowercase alphanumeric with hyphens, dots, or underscores only"
            )
        if ".." in v:
            raise ValueError("Slug cannot contain consecutive dots")
        return v
# app/schemas/moderator.py
from pydantic import BaseModel, Field, SecretStr

class CredentialsCreate(BaseModel):
    esxi_host: str = Field(..., min_length=1, max_length=255, description="ESXi host address")
    username: str = Field(..., min_length=1, max_length=128, description="ESXi username")
    password: SecretStr = Field(..., min_length=1, max_length=128, description="ESXi password")

class CredentialsUpdate(BaseModel):
    esxi_host: str = Field(..., min_length=1, max_length=255, description="New ESXi host address")
    username: str = Field(..., min_length=1, max_length=128, description="New ESXi username")
    password: SecretStr = Field(..., min_length=1, max_length=128, description="New ESXi password")
    old_username: str = Field(..., description="Current username for verification")
    old_password: SecretStr = Field(..., description="Current password for verification")

class CredentialsResponse(BaseModel):
    message: str

class HostInfo(BaseModel):
    esxi_host: str = Field(..., description="ESXi host address")
    username: str = Field(..., description="ESXi username")
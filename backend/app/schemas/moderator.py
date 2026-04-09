# app/schemas/moderator.py
from pydantic import BaseModel, Field

class CredentialsCreate(BaseModel):
    esxi_host: str = Field("", description="ESXi host")
    username: str = Field("", description="ESXi username")
    password: str = Field("", description="ESXi password")

class CredentialsResponse(BaseModel):
    path: str
    message: str

class CredentialsInfo(BaseModel):
    host: str
    username: str

class CredentialsUpdate(BaseModel):
    esxi_host: str = Field("", description="New ESXi host")
    username: str = Field("", description="New ESXi username")
    password: str = Field("", description="New ESXi password")
    old_username: str = Field("", description="Current username for verification")
    old_password: str = Field("", description="Current password for verification")
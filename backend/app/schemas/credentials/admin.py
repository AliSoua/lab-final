# app/schemas/credentials/admin.py
from pydantic import BaseModel, Field, SecretStr


class VCenterCredentialsCreate(BaseModel):
    vcenter_host: str = Field(
        ..., min_length=1, max_length=255, description="vCenter host address or FQDN"
    )
    username: str = Field(
        ..., min_length=1, max_length=128, description="vCenter username"
    )
    password: SecretStr = Field(
        ..., min_length=1, max_length=128, description="vCenter password"
    )


class VCenterCredentialsUpdate(BaseModel):
    vcenter_host: str = Field(
        ..., min_length=1, max_length=255, description="New vCenter host address or FQDN"
    )
    username: str = Field(
        ..., min_length=1, max_length=128, description="New vCenter username"
    )
    password: SecretStr = Field(
        ..., min_length=1, max_length=128, description="New vCenter password"
    )
    old_username: str = Field(
        ..., description="Current username for verification before update"
    )
    old_password: SecretStr = Field(
        ..., description="Current password for verification before update"
    )


class VCenterCredentialsResponse(BaseModel):
    message: str


class VCenterInfo(BaseModel):
    vcenter_host: str = Field(..., description="vCenter host address or FQDN")
    username: str = Field(..., description="vCenter username")
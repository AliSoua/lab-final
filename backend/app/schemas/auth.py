# app/schemas/auth.py
from pydantic import BaseModel
from typing import Optional, Dict, Any

class LoginRequest(BaseModel):
    username: str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    refresh_expires_in: int
    token_type: str
    scope: str

class LogoutRequest(BaseModel):
    refresh_token: str

class CheckAuthResponse(BaseModel):
    logged_in: bool
    user: Optional[Dict[str, Any]]
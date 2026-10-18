"""
Authentication Schemas.
"""

from typing import Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int = 86400


class WSSecurityCredentials(BaseModel):
    username: str
    password_digest: str
    nonce: str
    created: str


class AuthValidationResult(BaseModel):
    valid: bool
    user: Optional[str] = None
    error: Optional[str] = None

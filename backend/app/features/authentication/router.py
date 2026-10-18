"""
Authentication FastAPI Router.
"""

from fastapi import APIRouter, Depends, Header, HTTPException, status

from backend.app.features.authentication.schemas import (
    AuthValidationResult,
    LoginRequest,
    TokenResponse,
    WSSecurityCredentials,
)
from backend.app.features.authentication.service import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    return auth_service.create_session_token(req)


@router.get("/verify")
async def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid token")
    token = authorization.split(" ", 1)[1]
    username = auth_service.validate_token(token)
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return {"valid": True, "username": username}


@router.post("/verify-ws-security", response_model=AuthValidationResult)
async def verify_ws_security(creds: WSSecurityCredentials, expected_password: str):
    return auth_service.verify_ws_security_digest(creds, expected_password)

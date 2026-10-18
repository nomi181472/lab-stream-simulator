"""
Authentication Service.
Handles WS-Security UsernameToken password digest verification, replay protection, and session credentials.
"""

import base64
import hashlib
import time
import secrets
from datetime import datetime, timezone
from typing import Dict, Optional, Set

from backend.app.features.authentication.schemas import (
    AuthValidationResult,
    LoginRequest,
    TokenResponse,
    WSSecurityCredentials,
)
from backend.app.shared.logging.logger import get_logger

logger = get_logger(__name__, feature="authentication")


class AuthenticationService:
    def __init__(self):
        # In-memory nonce cache with timestamps for replay attack prevention
        self._nonce_cache: Dict[str, float] = {}
        self._active_tokens: Dict[str, str] = {}
        self.MAX_CLOCK_DRIFT_SECONDS = 300  # 5 minutes
        self.NONCE_EXPIRY_SECONDS = 600      # 10 minutes

    def _cleanup_old_nonces(self) -> None:
        """Evict nonces older than expiry window."""
        now = time.time()
        expired = [nonce for nonce, ts in self._nonce_cache.items() if now - ts > self.NONCE_EXPIRY_SECONDS]
        for nonce in expired:
            self._nonce_cache.pop(nonce, None)

    def verify_ws_security_digest(
        self,
        credentials: WSSecurityCredentials,
        expected_password: str,
    ) -> AuthValidationResult:
        """
        Validate WS-Security UsernameToken PasswordDigest.
        Digest = Base64(SHA-1(RawNonce + Created + Password))
        """
        self._cleanup_old_nonces()

        # 1. Nonce replay check
        if credentials.nonce in self._nonce_cache:
            logger.warning(f"WS-Security replay attack detected: nonce {credentials.nonce} already used")
            return AuthValidationResult(valid=False, error="Nonce already used (replay attack)")

        # 2. Timestamp clock drift validation
        try:
            created_dt = datetime.fromisoformat(credentials.created.replace("Z", "+00:00"))
            drift = abs((datetime.now(timezone.utc) - created_dt).total_seconds())
            if drift > self.MAX_CLOCK_DRIFT_SECONDS:
                return AuthValidationResult(
                    valid=False,
                    error=f"Timestamp clock drift ({drift:.1f}s) exceeds maximum allowed ({self.MAX_CLOCK_DRIFT_SECONDS}s)"
                )
        except Exception as e:
            return AuthValidationResult(valid=False, error=f"Invalid Created timestamp format: {e}")

        # 3. Compute expected digest
        try:
            try:
                raw_nonce = base64.b64decode(credentials.nonce)
            except Exception:
                raw_nonce = credentials.nonce.encode("utf-8")

            created_bytes = credentials.created.encode("utf-8")
            password_bytes = expected_password.encode("utf-8")

            hasher = hashlib.sha1()
            hasher.update(raw_nonce)
            hasher.update(created_bytes)
            hasher.update(password_bytes)
            expected_digest = base64.b64encode(hasher.digest()).decode("ascii")

            if secrets.compare_digest(credentials.password_digest.strip(), expected_digest.strip()):
                self._nonce_cache[credentials.nonce] = time.time()
                return AuthValidationResult(valid=True, user=credentials.username)
            else:
                return AuthValidationResult(valid=False, error="PasswordDigest mismatch")
        except Exception as e:
            return AuthValidationResult(valid=False, error=f"Digest calculation error: {e}")

    def create_session_token(self, req: LoginRequest) -> TokenResponse:
        """Issue simple bearer token for dashboard or API access."""
        token = secrets.token_urlsafe(32)
        self._active_tokens[token] = req.username
        return TokenResponse(access_token=token)

    def validate_token(self, token: str) -> Optional[str]:
        """Validate bearer token."""
        return self._active_tokens.get(token)


auth_service = AuthenticationService()

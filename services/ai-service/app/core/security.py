"""Server-to-server bearer authentication.

This check identifies the calling backend. It is not customer or admin authorization.
"""

import hashlib
import secrets
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings

_MAX_TOKEN_LENGTH = 256
_bearer = HTTPBearer(auto_error=False, scheme_name="ServiceBearer")


def secrets_match(provided: str, expected: str) -> bool:
    """Compare UTF-8 secrets without taking an early exit on length."""
    provided_digest = hashlib.sha256(provided.encode("utf-8")).digest()
    expected_digest = hashlib.sha256(expected.encode("utf-8")).digest()
    matched = secrets.compare_digest(provided_digest, expected_digest)
    return bool(expected) and matched


def token_is_accepted(provided: str, settings: Settings) -> bool:
    if not provided or len(provided) > _MAX_TOKEN_LENGTH:
        return False
    current = settings.ai_service_api_key.get_secret_value()
    previous = settings.ai_service_api_key_previous.get_secret_value()
    current_ok = secrets_match(provided, current)
    previous_ok = secrets_match(provided, previous)
    return current_ok or previous_ok


async def require_service_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = None,
) -> None:
    """FastAPI dependency body. Use `service_auth` in routes so OpenAPI sees the bearer scheme."""
    settings: Settings = request.app.state.settings
    if not settings.ai_service_api_key.get_secret_value():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service authentication is not configured",
        )
    if (
        credentials is None
        or credentials.scheme.lower() != "bearer"
        or not token_is_accepted(credentials.credentials, settings)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def service_auth(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> None:
    await require_service_auth(request, credentials)

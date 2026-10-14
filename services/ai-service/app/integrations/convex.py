"""Least-privilege Convex HTTP client.

Phase 1 can prove that an HTTP actions origin answers. It cannot read or write
products, orders, or customers, and it never treats a network response as
authorization. Existing Convex functions are unchanged.
"""

from collections.abc import Mapping
from typing import Literal

import httpx
from pydantic import BaseModel, ConfigDict

from app.core.config import Settings

# Future paths must name a specific internal HTTP action.
# Bulk product, order, and customer exports stay off this list.
_ALLOWLISTED_PATHS: frozenset[str] = frozenset()
_USER_AGENT = "ecommerce-ai-service"


class ConvexClientError(Exception):
    """Configuration or allowlist failure. The message does not include secrets."""


class ConvexProbeResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    configured: bool
    checked: bool
    reachable: bool | None = None
    status_code: int | None = None
    authenticated: Literal[None] = None


class ConvexClient:
    def __init__(self, settings: Settings, *, client: httpx.AsyncClient | None = None) -> None:
        self._settings = settings
        self._client = client

    @property
    def configured(self) -> bool:
        return bool(self._settings.convex_internal_url and self._token)

    @property
    def _token(self) -> str:
        return self._settings.convex_service_token.get_secret_value()

    def _validate_target(self) -> str:
        target = self._settings.convex_internal_url
        if not target or not self._token:
            raise ConvexClientError("Convex HTTP actions URL and service token are not configured")
        if self._client is not None and self._client.follow_redirects:
            raise ConvexClientError("Convex HTTP client must not follow redirects")
        return target

    def _auth_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._token}",
            "Accept": "application/json",
            "User-Agent": _USER_AGENT,
        }

    async def probe(self) -> ConvexProbeResult:
        """Contact the HTTP actions origin without reading a response body.

        `reachable` means the origin returned an HTTP response that was not a redirect.
        `authenticated` stays null because Phase 1 has no Convex route that accepts this token.
        """
        if not self.configured:
            return ConvexProbeResult(configured=False, checked=False, reachable=None)
        target = self._validate_target()
        owns_client = self._client is None
        client = self._client or httpx.AsyncClient(
            timeout=httpx.Timeout(5.0),
            follow_redirects=False,
        )
        try:
            async with client.stream("GET", target, headers=self._auth_headers()) as response:
                status_code = response.status_code
        except httpx.HTTPError:
            return ConvexProbeResult(configured=True, checked=True, reachable=False)
        finally:
            if owns_client:
                await client.aclose()
        if 300 <= status_code < 400:
            return ConvexProbeResult(
                configured=True,
                checked=True,
                reachable=False,
                status_code=status_code,
            )
        return ConvexProbeResult(
            configured=True,
            checked=True,
            reachable=True,
            status_code=status_code,
        )

    async def call_allowlisted(
        self,
        path: str,
        *,
        json_body: Mapping[str, object] | None = None,
    ) -> dict[str, object]:
        """Reserved for a future allowlisted Convex HTTP action. Refuses every path today."""
        normalized = _normalize_path(path)
        if normalized not in _ALLOWLISTED_PATHS or json_body is not None:
            raise ConvexClientError(
                "No Convex HTTP actions are allowlisted for the Python AI service in Phase 1"
            )
        raise ConvexClientError(
            "No Convex HTTP actions are allowlisted for the Python AI service in Phase 1"
        )


def _normalize_path(path: str) -> str:
    if not path.startswith("/") or path.startswith("//"):
        raise ConvexClientError("Convex path is not allowed")
    if any(part in path for part in ("..", "\\", "?", "#")):
        raise ConvexClientError("Convex path is not allowed")
    return path

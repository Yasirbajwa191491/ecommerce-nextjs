import logging

from fastapi import Request
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.logging import SecretRedactionFilter, SecretRedactor
from app.core.security import secrets_match
from app.main import create_app
from tests.conftest import auth_header


def test_secrets_match_rejects_empty_and_different_lengths() -> None:
    assert secrets_match("same-token", "same-token") is True
    assert secrets_match("short", "much-longer-token") is False
    assert secrets_match("", "") is False
    assert secrets_match("token", "") is False
    assert secrets_match("", "token") is False


def test_authenticated_status(client: TestClient, api_key: str) -> None:
    response = client.get("/api/v1/internal/status", headers=auth_header(api_key))
    assert response.status_code == 200
    body = response.json()
    assert body == {"status": "ok", "inference_enabled": False}
    assert api_key not in response.text


def test_previous_api_key_is_accepted_during_rotation(api_key: str) -> None:
    previous = "previous-service-key-0123456789"
    settings = Settings(
        _env_file=None,
        app_env="test",
        ai_service_api_key=api_key,
        ai_service_api_key_previous=previous,
    )
    with TestClient(create_app(settings)) as client:
        current = client.get("/api/v1/internal/status", headers=auth_header(api_key))
        rotated = client.get("/api/v1/internal/status", headers=auth_header(previous))
    assert current.status_code == 200
    assert rotated.status_code == 200
    assert previous not in current.text
    assert api_key not in rotated.text


def test_missing_authorization_header_is_rejected(client: TestClient, api_key: str) -> None:
    response = client.get("/api/v1/internal/status")
    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized"}
    assert api_key not in response.text


def test_incorrect_api_key_is_rejected(client: TestClient, api_key: str) -> None:
    wrong = "wrong-service-key-not-the-real-one"
    response = client.get("/api/v1/internal/status", headers=auth_header(wrong))
    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized"}
    assert wrong not in response.text
    assert api_key not in response.text


def test_query_and_alternate_headers_are_not_accepted(client: TestClient, api_key: str) -> None:
    by_query = client.get("/api/v1/internal/status", params={"api_key": api_key})
    by_header = client.get("/api/v1/internal/status", headers={"X-Api-Key": api_key})
    assert by_query.status_code == 401
    assert by_header.status_code == 401
    assert api_key not in by_query.text
    assert api_key not in by_header.text


def test_missing_server_api_key_fails_closed() -> None:
    settings = Settings(_env_file=None, app_env="test", ai_service_api_key="")
    with TestClient(create_app(settings)) as client:
        response = client.get(
            "/api/v1/internal/status",
            headers=auth_header("any-client-token"),
        )
    assert response.status_code == 503
    assert response.json() == {"detail": "Service authentication is not configured"}
    assert "any-client-token" not in response.text


def test_unexpected_errors_hide_exception_text(settings: Settings, api_key: str) -> None:
    service = create_app(settings)

    @service.get("/boom")
    async def boom(request: Request) -> dict[str, str]:
        del request
        raise RuntimeError(f"failed with key {api_key}")

    with TestClient(service, raise_server_exceptions=False) as client:
        response = client.get("/boom")
    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}
    assert api_key not in response.text


def test_log_filter_redacts_bearer_tokens_and_configured_secrets() -> None:
    secret = "configured-service-secret-value"
    redactor = SecretRedactor([secret])
    record = logging.LogRecord(
        name="ecommerce_ai_service",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="Authorization Bearer %s leaked %s",
        args=("another-bearer-token", secret),
        exc_info=None,
    )
    assert SecretRedactionFilter(redactor).filter(record) is True
    message = record.getMessage()
    assert secret not in message
    assert "another-bearer-token" not in message
    assert "[REDACTED]" in message

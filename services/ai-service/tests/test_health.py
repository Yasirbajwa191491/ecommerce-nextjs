import logging
from pathlib import Path

from fastapi import Request
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.core.config import Settings
from app.main import app, create_app
from tests.conftest import TEST_API_KEY


def test_application_starts_and_stops_without_loading_models(settings: Settings, caplog) -> None:
    service = create_app(settings)
    logger_name = "ecommerce_ai_service"
    with caplog.at_level(logging.INFO, logger=logger_name):
        logging.getLogger(logger_name).addHandler(caplog.handler)
        with TestClient(service):
            pass
    text = caplog.text
    assert "application_start" in text
    assert "application_stop" in text
    assert "torch" not in text.lower()
    assert "download" not in text.lower()
    assert TEST_API_KEY not in text


def test_module_app_exposes_asgi_entrypoint() -> None:
    with TestClient(app) as client:
        response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "live"}


def test_liveness(client: TestClient, api_key: str) -> None:
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "live"}
    assert api_key not in response.text
    assert "convex" not in response.text.lower()
    assert "authorization" not in response.text.lower()


def test_readiness_when_inference_is_disabled(client: TestClient, api_key: str) -> None:
    response = client.get("/health/ready")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "checks": {"application": "ok", "model_inference": "disabled"},
    }
    assert api_key not in response.text


def test_readiness_does_not_claim_a_model_when_inference_is_enabled(api_key: str) -> None:
    settings = Settings(
        _env_file=None,
        app_env="test",
        ai_service_api_key=api_key,
        enable_model_inference=True,
    )
    with TestClient(create_app(settings)) as client:
        ready = client.get("/health/ready")
        live = client.get("/health/live")
    assert live.status_code == 200
    assert ready.status_code == 503
    assert ready.json()["status"] == "not_ready"
    assert ready.json()["checks"]["model_inference"] == "unavailable"
    assert "artifact" not in ready.text.lower()


def test_startup_does_not_train_or_require_a_model_artifact(api_key: str, tmp_path: Path) -> None:
    artifacts = tmp_path / "artifacts"
    settings = Settings(
        _env_file=None,
        app_env="test",
        ai_service_api_key=api_key,
        artifacts_dir=str(artifacts),
    )
    with TestClient(create_app(settings)) as client:
        response = client.get("/health/ready")
    assert response.status_code == 200
    assert response.json()["checks"]["model_inference"] == "disabled"
    assert not artifacts.exists()


def test_health_does_not_enable_cors(client: TestClient) -> None:
    response = client.get("/health/live", headers={"Origin": "https://shop.example"})
    assert "access-control-allow-origin" not in response.headers


def test_development_publishes_openapi_without_secrets(api_key: str) -> None:
    settings = Settings(_env_file=None, app_env="development", ai_service_api_key=api_key)
    with TestClient(create_app(settings)) as client:
        schema = client.get("/openapi.json")
        docs = client.get("/docs")
    assert schema.status_code == 200
    assert docs.status_code == 200
    assert "/health/live" in schema.json()["paths"]
    assert "/api/v1/internal/status" in schema.json()["paths"]
    assert api_key not in schema.text


def test_production_hides_openapi(api_key: str) -> None:
    settings = Settings(
        _env_file=None,
        app_env="production",
        ai_service_api_key=api_key + "-production-key",
    )
    with TestClient(create_app(settings)) as client:
        assert client.get("/openapi.json").status_code == 404
        assert client.get("/docs").status_code == 404
        assert client.get("/redoc").status_code == 404
        assert client.get("/health/live").status_code == 200


def test_validation_errors_omit_submitted_values(settings: Settings) -> None:
    service = create_app(settings)

    class Payload(BaseModel):
        note: str

    @service.post("/api/v1/internal/validation-probe")
    async def validation_probe(payload: Payload, request: Request) -> dict[str, bool]:
        del payload, request
        return {"ok": True}

    secret = "submitted-secret-value"
    with TestClient(service) as client:
        response = client.post(
            "/api/v1/internal/validation-probe",
            json={"note": [secret]},
        )
    assert response.status_code == 422
    assert secret not in response.text
    assert "input" not in response.json()["detail"][0]

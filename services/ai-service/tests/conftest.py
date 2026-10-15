import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

ENV_KEYS = (
    "APP_NAME",
    "APP_ENV",
    "APP_HOST",
    "APP_PORT",
    "LOG_LEVEL",
    "AI_SERVICE_API_KEY",
    "AI_SERVICE_API_KEY_PREVIOUS",
    "CONVEX_URL",
    "CONVEX_INTERNAL_URL",
    "CONVEX_SERVICE_TOKEN",
    "MODEL_ARTIFACTS_DIR",
    "CONTENT_MODEL_DIR",
    "COLLABORATIVE_MODEL_DIR",
    "HYBRID_MODEL_DIR",
    "ENABLE_MODEL_INFERENCE",
    "BEHAVIORAL_EXPORT_ENABLED",
)

TEST_API_KEY = "test-service-key-0123456789abcdef"


@pytest.fixture(autouse=True)
def isolate_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in ENV_KEYS:
        monkeypatch.delenv(key, raising=False)


@pytest.fixture
def api_key() -> str:
    return TEST_API_KEY


@pytest.fixture
def settings(api_key: str) -> Settings:
    return Settings(_env_file=None, app_env="test", ai_service_api_key=api_key)


@pytest.fixture
def client(settings: Settings) -> TestClient:
    with TestClient(create_app(settings)) as test_client:
        yield test_client


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}

import tomllib
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.config import Settings

ROOT = Path(__file__).resolve().parents[1]


def test_development_defaults() -> None:
    settings = Settings(_env_file=None)
    assert settings.app_name == "ecommerce-ai-service"
    assert settings.app_env == "development"
    assert settings.app_host == "127.0.0.1"
    assert settings.app_port == 8000
    assert settings.log_level == "INFO"
    assert settings.ai_service_api_key.get_secret_value() == ""
    assert settings.convex_url == ""
    assert settings.convex_internal_url == ""
    assert settings.artifacts_dir == "./artifacts"
    assert settings.enable_model_inference is False


def test_reads_documented_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("LOG_LEVEL", "debug")
    monkeypatch.setenv("APP_PORT", "8123")
    monkeypatch.setenv("MODEL_ARTIFACTS_DIR", "custom-artifacts")
    monkeypatch.setenv("ENABLE_MODEL_INFERENCE", "false")
    monkeypatch.setenv("AI_SERVICE_API_KEY", "  spaced-key  ")
    settings = Settings(_env_file=None)
    assert settings.app_env == "test"
    assert settings.log_level == "DEBUG"
    assert settings.app_port == 8123
    assert settings.artifacts_dir == "custom-artifacts"
    assert settings.enable_model_inference is False
    assert settings.ai_service_api_key.get_secret_value() == "spaced-key"


def test_invalid_port_and_environment_are_rejected() -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, app_port=0)
    with pytest.raises(ValidationError):
        Settings(_env_file=None, app_port=70000)
    with pytest.raises(ValidationError):
        Settings(_env_file=None, app_env="staging")
    with pytest.raises(ValidationError):
        Settings(_env_file=None, log_level="verbose")


def test_production_requires_a_long_api_key() -> None:
    with pytest.raises(ValidationError, match="AI_SERVICE_API_KEY"):
        Settings(_env_file=None, app_env="production")
    with pytest.raises(ValidationError, match="AI_SERVICE_API_KEY"):
        Settings(_env_file=None, app_env="production", ai_service_api_key="short")
    settings = Settings(
        _env_file=None,
        app_env="production",
        ai_service_api_key="p" * 32,
    )
    assert settings.app_env == "production"


def test_production_convex_urls_require_https_and_known_hosts() -> None:
    with pytest.raises(ValidationError, match="HTTPS"):
        Settings(
            _env_file=None,
            app_env="production",
            ai_service_api_key="p" * 32,
            convex_internal_url="http://example.convex.site",
        )
    with pytest.raises(ValidationError, match="localhost"):
        Settings(
            _env_file=None,
            app_env="production",
            ai_service_api_key="p" * 32,
            convex_internal_url="https://127.0.0.1",
        )
    with pytest.raises(ValidationError, match="not allowed"):
        Settings(
            _env_file=None,
            app_env="production",
            ai_service_api_key="p" * 32,
            convex_internal_url="https://example.com",
        )
    settings = Settings(
        _env_file=None,
        app_env="production",
        ai_service_api_key="p" * 32,
        convex_url="https://happy-animal-123.convex.cloud",
        convex_internal_url="https://happy-animal-123.convex.site/",
    )
    assert settings.convex_url == "https://happy-animal-123.convex.cloud"
    assert settings.convex_internal_url == "https://happy-animal-123.convex.site"


def test_urls_cannot_embed_credentials() -> None:
    with pytest.raises(ValidationError, match="credentials"):
        Settings(
            _env_file=None,
            app_env="test",
            convex_service_token="super-secret-token",
            convex_internal_url="https://super-secret-token@example.convex.site",
        )


def test_test_environment_allows_local_convex_without_a_key() -> None:
    settings = Settings(
        _env_file=None,
        app_env="test",
        convex_internal_url="http://127.0.0.1:3211",
        convex_url="http://127.0.0.1:3210",
    )
    assert settings.ai_service_api_key.get_secret_value() == ""
    assert settings.convex_internal_url == "http://127.0.0.1:3211"


def test_repr_and_dump_hide_the_api_key() -> None:
    secret = "repr-secret-key-should-stay-hidden"
    settings = Settings(_env_file=None, app_env="test", ai_service_api_key=secret)
    assert secret not in repr(settings)
    assert secret not in str(settings)
    assert secret not in settings.model_dump_json()


def test_runtime_dependencies_omit_large_ml_frameworks() -> None:
    data = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    names: set[str] = set()
    for dep in data["project"]["dependencies"]:
        names.add(_package_name(dep))
    for group in data.get("dependency-groups", {}).values():
        for dep in group:
            names.add(_package_name(dep))
    forbidden = {"torch", "tensorflow", "transformers", "langchain", "sentence-transformers"}
    assert forbidden.isdisjoint(names)


def test_import_does_not_load_ml_frameworks() -> None:
    import sys

    import app.main

    forbidden = ("torch", "tensorflow", "transformers", "langchain")
    assert [name for name in forbidden if name in sys.modules] == []
    assert app.main.app is not None


def _package_name(dependency: str) -> str:
    name = dependency.split("[", 1)[0]
    for separator in ("<", ">", "=", "!", "~"):
        name = name.split(separator, 1)[0]
    return name.strip().lower()

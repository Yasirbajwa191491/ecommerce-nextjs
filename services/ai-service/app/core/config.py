"""Typed environment configuration.

Production rules run when a Settings instance is created, which is application
startup for the server and fixture setup for tests. Convex and model
integrations are optional so unit tests can boot without external services.
"""

from typing import Literal
from urllib.parse import urlsplit, urlunsplit

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

AppEnv = Literal["development", "test", "production"]
LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]

_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
_MIN_PRODUCTION_KEY_LENGTH = 32


def _host_is_allowed(hostname: str, *, suffix: str, allow_local: bool) -> bool:
    host = hostname.lower().rstrip(".")
    if host.endswith(suffix) and host != suffix.lstrip("."):
        return True
    return allow_local and host in _LOCAL_HOSTS


def _clean_base_url(
    value: str,
    *,
    https_only: bool,
    field_name: str,
    host_suffix: str,
) -> str:
    raw = value.strip()
    if not raw:
        return ""
    parts = urlsplit(raw)
    if parts.username or parts.password:
        raise ValueError(f"{field_name} must not embed credentials")
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        raise ValueError(f"{field_name} must be an HTTP or HTTPS URL")
    if https_only and parts.scheme != "https":
        raise ValueError(f"{field_name} must use HTTPS in production")
    if https_only and parts.hostname.lower() in _LOCAL_HOSTS:
        raise ValueError(f"{field_name} must not use localhost in production")
    if not _host_is_allowed(parts.hostname, suffix=host_suffix, allow_local=not https_only):
        raise ValueError(f"{field_name} host is not allowed")
    cleaned = urlunsplit((parts.scheme, parts.netloc, parts.path.rstrip("/"), "", ""))
    return cleaned.rstrip("/")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        populate_by_name=True,
    )

    app_name: str = "ecommerce-ai-service"
    app_env: AppEnv = "development"
    app_host: str = "127.0.0.1"
    app_port: int = Field(default=8000, ge=1, le=65535)
    log_level: LogLevel = "INFO"
    ai_service_api_key: SecretStr = SecretStr("")
    ai_service_api_key_previous: SecretStr = SecretStr("")
    convex_url: str = ""
    convex_internal_url: str = ""
    convex_service_token: SecretStr = SecretStr("")
    artifacts_dir: str = Field(default="./artifacts", validation_alias="MODEL_ARTIFACTS_DIR")
    content_model_dir: str = Field(default="", validation_alias="CONTENT_MODEL_DIR")
    enable_model_inference: bool = False

    @field_validator("log_level", mode="before")
    @classmethod
    def normalize_log_level(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().upper()
        return value

    @field_validator(
        "ai_service_api_key",
        "ai_service_api_key_previous",
        "convex_service_token",
        mode="before",
    )
    @classmethod
    def strip_secret(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("app_name")
    @classmethod
    def validate_app_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned or len(cleaned) > 80 or any(char in cleaned for char in "\r\n"):
            raise ValueError("APP_NAME is invalid")
        return cleaned

    @field_validator("app_host")
    @classmethod
    def validate_host(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned or len(cleaned) > 255 or any(char in cleaned for char in "\r\n/"):
            raise ValueError("APP_HOST is invalid")
        return cleaned

    @field_validator("artifacts_dir")
    @classmethod
    def validate_artifacts_dir(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned or len(cleaned) > 260:
            raise ValueError("MODEL_ARTIFACTS_DIR is invalid")
        return cleaned

    @field_validator("content_model_dir")
    @classmethod
    def validate_content_model_dir(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) > 260 or any(char in cleaned for char in "\r\n"):
            raise ValueError("CONTENT_MODEL_DIR is invalid")
        return cleaned

    @model_validator(mode="after")
    def validate_environment(self) -> "Settings":
        production = self.app_env == "production"
        self.convex_url = _clean_base_url(
            self.convex_url,
            https_only=production,
            field_name="CONVEX_URL",
            host_suffix=".convex.cloud",
        )
        self.convex_internal_url = _clean_base_url(
            self.convex_internal_url,
            https_only=production,
            field_name="CONVEX_INTERNAL_URL",
            host_suffix=".convex.site",
        )
        if production:
            key = self.ai_service_api_key.get_secret_value()
            if len(key) < _MIN_PRODUCTION_KEY_LENGTH:
                raise ValueError(
                    "AI_SERVICE_API_KEY is required in production and must be at least "
                    f"{_MIN_PRODUCTION_KEY_LENGTH} characters"
                )
            previous = self.ai_service_api_key_previous.get_secret_value()
            if previous and len(previous) < _MIN_PRODUCTION_KEY_LENGTH:
                raise ValueError(
                    "AI_SERVICE_API_KEY_PREVIOUS must be at least "
                    f"{_MIN_PRODUCTION_KEY_LENGTH} characters when set"
                )
        return self

    def __repr__(self) -> str:
        return f"Settings(app_name={self.app_name!r}, app_env={self.app_env!r})"


def get_settings() -> Settings:
    return Settings()

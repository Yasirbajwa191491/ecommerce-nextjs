"""Log formatting that removes service credentials before they are emitted."""

import json
import logging
import re
from datetime import UTC, datetime

from app.core.config import Settings

_LOGGER_NAME = "ecommerce_ai_service"
_BEARER = re.compile(r"Bearer\s+\S+", re.IGNORECASE)


class SecretRedactor:
    def __init__(self, secrets: list[str]) -> None:
        self._secrets = [secret for secret in secrets if len(secret) >= 8]

    def redact(self, text: str) -> str:
        redacted = _BEARER.sub("Bearer [REDACTED]", text)
        for secret in self._secrets:
            redacted = redacted.replace(secret, "[REDACTED]")
        return redacted


class SecretRedactionFilter(logging.Filter):
    def __init__(self, redactor: SecretRedactor) -> None:
        super().__init__()
        self._redactor = redactor

    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = self._redactor.redact(record.getMessage())
        record.args = ()
        if record.exc_info:
            formatted = logging.Formatter().formatException(record.exc_info)
            record.exc_text = self._redactor.redact(formatted)
            record.exc_info = None
        return True


class ServiceFormatter(logging.Formatter):
    def __init__(self, *, json_logs: bool) -> None:
        super().__init__()
        self._json_logs = json_logs

    def format(self, record: logging.LogRecord) -> str:
        message = record.getMessage()
        if record.exc_text:
            message = f"{message}\n{record.exc_text}"
        if not self._json_logs:
            return f"{record.levelname} {record.name} {message}"
        payload = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": message,
        }
        return json.dumps(payload, ensure_ascii=True)


def service_logger() -> logging.Logger:
    return logging.getLogger(_LOGGER_NAME)


def configure_logging(settings: Settings) -> None:
    global _configured
    secrets = [
        settings.ai_service_api_key.get_secret_value(),
        settings.ai_service_api_key_previous.get_secret_value(),
        settings.convex_service_token.get_secret_value(),
    ]
    logger = service_logger()
    logger.setLevel(settings.log_level)
    logger.handlers.clear()
    logger.filters.clear()
    logger.propagate = False
    handler = logging.StreamHandler()
    handler.setFormatter(ServiceFormatter(json_logs=settings.app_env == "production"))
    handler.addFilter(SecretRedactionFilter(SecretRedactor(secrets)))
    logger.addHandler(handler)

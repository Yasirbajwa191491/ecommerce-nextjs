"""Normalized behavioral event contract.

Rows are implicit-feedback signals. They must not carry email, phone, address,
payment data, or a raw customer key. `visitor_id` is a purpose-scoped token.
A persistent pseudonymous token is still personal data and is only accepted
from a synthetic file or an explicitly enabled export.
"""

import json
import re
from collections.abc import Iterator, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from app.ml.behavioral.constants import DATASET_SOURCES, EVENT_TYPES, PLATFORMS
from app.ml.errors import DatasetValidationError

_ID_CHARS = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-")
_EMAIL_HINT = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
_FORBIDDEN_KEYS = frozenset(
    {
        "email",
        "phone",
        "customer_email",
        "customer_phone",
        "customer_key",
        "customerkey",
        "address",
        "name",
        "payment",
        "card",
        "ip",
        "ip_address",
    }
)


@dataclass(frozen=True)
class BehavioralEvent:
    event_id: str
    event_type: str
    product_id: str
    visitor_id: str
    occurred_at: datetime
    platform: str
    placement: str | None
    model_version: str | None
    source: str
    order_id: str | None

    def to_dict(self) -> dict[str, object]:
        payload: dict[str, object] = {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "product_id": self.product_id,
            "visitor_id": self.visitor_id,
            "occurred_at": self.occurred_at.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "platform": self.platform,
            "source": self.source,
            "data_origin": self.source,
        }
        if self.placement:
            payload["placement"] = self.placement
        if self.model_version:
            payload["model_version"] = self.model_version
        if self.order_id:
            payload["order_id"] = self.order_id
        return payload


def assert_identifier(value: str, *, field: str) -> str:
    cleaned = value.strip()
    if not cleaned or len(cleaned) > 128 or cleaned[0] in {"-", "_"}:
        raise DatasetValidationError(f"Invalid {field}")
    if any(character not in _ID_CHARS for character in cleaned):
        raise DatasetValidationError(f"Invalid {field}")
    if _EMAIL_HINT.search(cleaned):
        raise DatasetValidationError(f"Invalid {field}")
    return cleaned


def parse_timestamp(value: object) -> datetime:
    if isinstance(value, bool) or value is None:
        raise DatasetValidationError("Invalid timestamp")
    if isinstance(value, (int, float)):
        if not isinstance(value, int) and not float(value).is_integer():
            raise DatasetValidationError("Invalid timestamp")
        millis = int(value)
        if millis < 946_684_800_000 or millis > 4_102_444_800_000:
            raise DatasetValidationError("Invalid timestamp")
        return datetime.fromtimestamp(millis / 1000, tz=UTC)
    if not isinstance(value, str):
        raise DatasetValidationError("Invalid timestamp")
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError as exc:
        raise DatasetValidationError("Invalid timestamp") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    parsed = parsed.astimezone(UTC).replace(microsecond=0)
    if parsed.year < 2000 or parsed.year > 2100:
        raise DatasetValidationError("Invalid timestamp")
    return parsed


def parse_event(payload: Mapping[str, object]) -> BehavioralEvent:
    lowered = {str(key).strip().lower() for key in payload}
    if lowered & _FORBIDDEN_KEYS:
        raise DatasetValidationError("Event contains a forbidden personal field")
    for key, value in payload.items():
        if isinstance(value, str) and _EMAIL_HINT.search(value):
            raise DatasetValidationError("Event contains a forbidden personal field")
        if key == "visitor_id" and isinstance(value, str) and value.lower().startswith("order:"):
            raise DatasetValidationError("Event contains a raw order visitor id")
    event_id = assert_identifier(_required_str(payload, "event_id"), field="event_id")
    event_type = _required_str(payload, "event_type")
    if event_type not in EVENT_TYPES:
        raise DatasetValidationError("Invalid event type")
    product_id = assert_identifier(_required_str(payload, "product_id"), field="product_id")
    visitor_raw = payload.get("visitor_id")
    if not isinstance(visitor_raw, str) or not visitor_raw.strip():
        raise DatasetValidationError("Missing visitor id")
    visitor_id = assert_identifier(visitor_raw, field="visitor_id")
    occurred_at = parse_timestamp(payload.get("occurred_at"))
    platform = payload.get("platform") or "unspecified"
    if not isinstance(platform, str) or platform not in PLATFORMS:
        raise DatasetValidationError("Invalid platform")
    source = payload.get("source") or payload.get("data_origin")
    if not isinstance(source, str) or source not in DATASET_SOURCES:
        raise DatasetValidationError("Invalid event source")
    placement = _optional_short(payload.get("placement"), field="placement")
    model_version = _optional_short(payload.get("model_version"), field="model_version")
    order_id = payload.get("order_id")
    parsed_order: str | None = None
    if order_id is not None:
        if not isinstance(order_id, str):
            raise DatasetValidationError("Invalid order id")
        parsed_order = assert_identifier(order_id, field="order_id")
    if event_type == "purchase" and parsed_order is None:
        raise DatasetValidationError("Purchase events require an order id")
    return BehavioralEvent(
        event_id=event_id,
        event_type=event_type,
        product_id=product_id,
        visitor_id=visitor_id,
        occurred_at=occurred_at,
        platform=platform,
        placement=placement,
        model_version=model_version,
        source=source,
        order_id=parsed_order,
    )


def load_event_jsonl(path: Path) -> tuple[list[BehavioralEvent], list[dict[str, object]]]:
    if not path.is_file():
        raise DatasetValidationError("Behavioral dataset file was not found")
    accepted: list[BehavioralEvent] = []
    rejected: list[dict[str, object]] = []
    seen_ids: set[str] = set()
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        raise DatasetValidationError("Behavioral dataset file could not be read") from exc
    for line_number, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        try:
            payload = json.loads(line)
            if not isinstance(payload, dict):
                raise DatasetValidationError("Event row must be an object")
            event = parse_event(payload)
            if event.event_id in seen_ids:
                raise DatasetValidationError("Duplicate event id")
            seen_ids.add(event.event_id)
        except (DatasetValidationError, json.JSONDecodeError) as exc:
            reason = "Invalid event row" if isinstance(exc, json.JSONDecodeError) else str(exc)
            rejected.append({"line": line_number, "reason": reason})
            continue
        accepted.append(event)
    return accepted, rejected


def iter_jsonl(path: Path) -> Iterator[dict[str, object]]:
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        payload = json.loads(line)
        if isinstance(payload, dict):
            yield payload


def _required_str(payload: Mapping[str, object], key: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value.strip():
        raise DatasetValidationError(f"Missing {key.replace('_', ' ')}")
    if len(value) > 256:
        raise DatasetValidationError(f"Invalid {key.replace('_', ' ')}")
    return value.strip()


def _optional_short(value: object, *, field: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise DatasetValidationError(f"Invalid {field}")
    cleaned = value.strip()
    if not cleaned:
        return None
    if len(cleaned) > 80:
        raise DatasetValidationError(f"Invalid {field}")
    return cleaned

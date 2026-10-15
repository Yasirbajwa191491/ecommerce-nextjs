"""Typed adapter for a future authorized Convex behavioral export.

The adapter does not open a connection and does not read credentials. Callers
must pass records that were already minimized. Production extraction stays
disabled unless `BEHAVIORAL_EXPORT_ENABLED` is exactly true.
"""

from collections.abc import Mapping

from app.ml.behavioral.schema import BehavioralEvent, parse_event
from app.ml.errors import DatasetValidationError

_CONVEX_EVENT_MAP = {
    "view": "product_view",
    "impression": "recommendation_impression",
    "click": "recommendation_click",
    "cart_add": "add_to_cart",
    "wishlist_add": "wishlist_add",
    "product_comparison": "product_comparison",
    "search_result_click": "search_result_click",
}


class BehavioralExportDisabled(DatasetValidationError):
    """Production behavioral extraction has not been turned on."""


def assert_export_enabled(enabled: bool) -> None:
    if not enabled:
        raise BehavioralExportDisabled(
            "Convex behavioral export is disabled. Set BEHAVIORAL_EXPORT_ENABLED=true "
            "only after a privacy review, and only with the behavioral export token and salt."
        )


def adapt_convex_record(payload: Mapping[str, object]) -> BehavioralEvent:
    """Accept one already-minimized export row.

    Purchase rows are accepted only when `purchase_authoritative` is true.
    That flag is set by the Convex order export, not by a client event.
    """

    if payload.get("purchase_authoritative") is True:
        event_type = "purchase"
    else:
        raw_type = payload.get("event_type")
        if raw_type == "purchase":
            raise DatasetValidationError("Client purchase events are not authoritative")
        if not isinstance(raw_type, str) or raw_type not in _CONVEX_EVENT_MAP:
            raise DatasetValidationError("Unsupported Convex event type")
        event_type = _CONVEX_EVENT_MAP[raw_type]
    adapted = {
        "event_id": payload.get("event_id"),
        "event_type": event_type,
        "product_id": payload.get("product_id"),
        "visitor_id": payload.get("visitor_id"),
        "occurred_at": payload.get("occurred_at"),
        "platform": payload.get("platform") or "unspecified",
        "source": "convex_export",
        "placement": payload.get("placement"),
        "model_version": payload.get("model_version"),
        "order_id": payload.get("order_id"),
    }
    return parse_event(adapted)

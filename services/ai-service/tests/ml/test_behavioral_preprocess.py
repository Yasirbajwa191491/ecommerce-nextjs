"""Behavioral event validation, aggregation, and the synthetic generator."""

from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from app.ml.behavioral.extract import (
    BehavioralExportDisabled,
    adapt_convex_record,
    assert_export_enabled,
)
from app.ml.behavioral.preprocess import aggregate_events
from app.ml.behavioral.schema import BehavioralEvent, load_event_jsonl, parse_event
from app.ml.behavioral.synthetic import generate_behavioral_dataset
from app.ml.behavioral.weights import saturate, weight_config
from app.ml.errors import DatasetValidationError


def _event(event_id: str, event_type: str = "product_view", **overrides: object) -> BehavioralEvent:
    payload: dict[str, object] = {
        "event_id": event_id,
        "event_type": event_type,
        "product_id": "hp-1",
        "visitor_id": "visitor-a",
        "occurred_at": "2024-01-02T00:00:00Z",
        "source": "synthetic",
    }
    payload.update(overrides)
    return parse_event(payload)


def test_valid_event_and_rejected_rows(tmp_path: Path) -> None:
    event = _event("view-1", platform="web", placement="home")
    assert event.event_type == "product_view"
    assert event.platform == "web"
    path = tmp_path / "events.jsonl"
    rows = [
        event.to_dict(),
        {
            "event_id": "dup",
            "event_type": "product_view",
            "product_id": "hp-1",
            "visitor_id": "visitor-a",
            "occurred_at": "2024-01-02T00:00:00Z",
            "source": "synthetic",
        },
        {
            "event_id": "dup",
            "event_type": "product_view",
            "product_id": "hp-1",
            "visitor_id": "visitor-a",
            "occurred_at": "2024-01-03T00:00:00Z",
            "source": "synthetic",
        },
        {
            "event_id": "no-visitor",
            "event_type": "product_view",
            "product_id": "hp-1",
            "occurred_at": "2024-01-02T00:00:00Z",
            "source": "synthetic",
        },
        {
            "event_id": "bad-time",
            "event_type": "product_view",
            "product_id": "hp-1",
            "visitor_id": "visitor-a",
            "occurred_at": "yesterday",
            "source": "synthetic",
        },
        {
            "event_id": "bad-product",
            "event_type": "product_view",
            "product_id": "bad id",
            "visitor_id": "visitor-a",
            "occurred_at": "2024-01-02T00:00:00Z",
            "source": "synthetic",
        },
        {
            "event_id": "mail",
            "event_type": "product_view",
            "product_id": "hp-1",
            "visitor_id": "visitor-a",
            "email": "a@example.com",
            "occurred_at": "2024-01-02T00:00:00Z",
            "source": "synthetic",
        },
    ]
    path.write_text(
        "\n".join(__import__("json").dumps(row) for row in rows) + "\n", encoding="utf-8"
    )
    accepted, rejected = load_event_jsonl(path)
    assert len(accepted) == 2
    assert {item["reason"] for item in rejected} >= {
        "Duplicate event id",
        "Missing visitor id",
        "Invalid timestamp",
        "Invalid product_id",
        "Event contains a forbidden personal field",
    }


def test_repeated_views_do_not_outrank_one_purchase() -> None:
    start = datetime(2024, 1, 1, tzinfo=UTC)
    views = [
        BehavioralEvent(
            event_id=f"view-{index}",
            event_type="product_view",
            product_id="viewed",
            visitor_id="visitor-a",
            occurred_at=start + timedelta(days=index),
            platform="unspecified",
            placement=None,
            model_version=None,
            source="synthetic",
            order_id=None,
        )
        for index in range(20)
    ]
    purchase = BehavioralEvent(
        event_id="buy-1",
        event_type="purchase",
        product_id="bought",
        visitor_id="visitor-b",
        occurred_at=start,
        platform="unspecified",
        placement=None,
        model_version=None,
        source="synthetic",
        order_id="order-1",
    )
    interactions, report = aggregate_events([*views, purchase], weight_config())
    weights = {item.product_id: item.weight for item in interactions}
    assert weights["bought"] > weights["viewed"]
    assert report.dropped_type_cap == 0
    assert saturate(1.0, 20.0) < saturate(6.0, 6.0)


def test_session_duplicates_caps_abnormal_visitors_and_purchase_dedupe() -> None:
    start = datetime(2024, 6, 1, tzinfo=UTC)
    events = [
        BehavioralEvent(
            event_id="s1",
            event_type="product_view",
            product_id="hp-1",
            visitor_id="visitor-a",
            occurred_at=start,
            platform="web",
            placement=None,
            model_version=None,
            source="synthetic",
            order_id=None,
        ),
        BehavioralEvent(
            event_id="s2",
            event_type="product_view",
            product_id="hp-1",
            visitor_id="visitor-a",
            occurred_at=start + timedelta(minutes=5),
            platform="web",
            placement=None,
            model_version=None,
            source="synthetic",
            order_id=None,
        ),
        BehavioralEvent(
            event_id="p1",
            event_type="purchase",
            product_id="hp-1",
            visitor_id="visitor-a",
            occurred_at=start + timedelta(days=3),
            platform="web",
            placement=None,
            model_version=None,
            source="synthetic",
            order_id="order-9",
        ),
        BehavioralEvent(
            event_id="p2",
            event_type="purchase",
            product_id="hp-1",
            visitor_id="visitor-a",
            occurred_at=start + timedelta(days=4),
            platform="web",
            placement=None,
            model_version=None,
            source="synthetic",
            order_id="order-9",
        ),
    ]
    events.extend(
        BehavioralEvent(
            event_id=f"bot-{index}",
            event_type="product_view",
            product_id="bk-1",
            visitor_id="visitor-bot",
            occurred_at=start + timedelta(days=index),
            platform="web",
            placement=None,
            model_version=None,
            source="synthetic",
            order_id=None,
        )
        for index in range(5)
    )
    config = weight_config()
    interactions, report = aggregate_events(
        events,
        type(config)(
            weights=config.weights,
            half_life_days=None,
            session_gap_seconds=1800,
            max_events_per_type=20,
            max_events_per_visitor=4,
            scheme="default",
        ),
        catalog_ids={"hp-1", "bk-1"},
    )
    assert report.dropped_session_duplicates == 1
    assert report.dropped_duplicate_purchases == 1
    assert report.dropped_abnormal_visitors == 5
    assert {item.visitor_id for item in interactions} == {"visitor-a"}


def test_recency_reduces_older_events_and_unknown_catalog_products_drop() -> None:
    start = datetime(2024, 1, 1, tzinfo=UTC)
    events = [
        BehavioralEvent(
            event_id="old",
            event_type="add_to_cart",
            product_id="hp-1",
            visitor_id="visitor-a",
            occurred_at=start,
            platform="unspecified",
            placement=None,
            model_version=None,
            source="synthetic",
            order_id=None,
        ),
        BehavioralEvent(
            event_id="new",
            event_type="add_to_cart",
            product_id="hp-2",
            visitor_id="visitor-a",
            occurred_at=start + timedelta(days=30),
            platform="unspecified",
            placement=None,
            model_version=None,
            source="synthetic",
            order_id=None,
        ),
        BehavioralEvent(
            event_id="gone",
            event_type="product_view",
            product_id="deleted-1",
            visitor_id="visitor-a",
            occurred_at=start,
            platform="unspecified",
            placement=None,
            model_version=None,
            source="synthetic",
            order_id=None,
        ),
    ]
    interactions, report = aggregate_events(
        events,
        weight_config(half_life_days=30),
        catalog_ids={"hp-1", "hp-2"},
    )
    weights = {item.product_id: item.weight for item in interactions}
    assert weights["hp-2"] > weights["hp-1"]
    assert "deleted-1" not in weights
    assert report.dropped_missing_catalog == 1


def test_synthetic_dataset_is_deterministic_and_labeled(tmp_path: Path) -> None:
    first = tmp_path / "a"
    second = tmp_path / "b"
    generate_behavioral_dataset(first)
    generate_behavioral_dataset(second)
    assert (first / "behavioral_events.jsonl").read_text(encoding="utf-8") == (
        second / "behavioral_events.jsonl"
    ).read_text(encoding="utf-8")
    manifest = (first / "behavioral_manifest.json").read_text(encoding="utf-8")
    assert "Synthetic" in manifest
    accepted, rejected = load_event_jsonl(first / "behavioral_events.jsonl")
    assert accepted
    assert all(event.source == "synthetic" for event in accepted)
    assert rejected


def test_convex_adapter_rejects_client_purchases_until_export_is_enabled() -> None:
    with pytest.raises(BehavioralExportDisabled):
        assert_export_enabled(False)
    assert_export_enabled(True)
    with pytest.raises(DatasetValidationError):
        adapt_convex_record(
            {
                "event_id": "p1",
                "event_type": "purchase",
                "product_id": "hp-1",
                "visitor_id": "visitor-a",
                "occurred_at": "2024-01-02T00:00:00Z",
            }
        )
    adapted = adapt_convex_record(
        {
            "event_id": "c1",
            "event_type": "cart_add",
            "product_id": "hp-1",
            "visitor_id": "visitor-a",
            "occurred_at": "2024-01-02T00:00:00Z",
            "platform": "mobile",
        }
    )
    assert adapted.event_type == "add_to_cart"
    assert adapted.source == "convex_export"

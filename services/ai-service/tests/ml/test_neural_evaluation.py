"""Fair temporal comparison includes the neural model and does not claim uplift."""

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.ml.behavioral.schema import BehavioralEvent
from evaluation.evaluate_behavioral import evaluate


def _event(event_id: str, visitor: str, product: str, day: int) -> BehavioralEvent:
    return BehavioralEvent(
        event_id=event_id,
        event_type="product_view",
        product_id=product,
        visitor_id=visitor,
        occurred_at=datetime(2024, 1, 1, tzinfo=UTC) + timedelta(days=day),
        platform="web",
        placement=None,
        model_version=None,
        source="synthetic",
        order_id=None,
    )


def test_neural_evaluation_uses_the_same_queries(tmp_path: Path) -> None:
    rows: list[BehavioralEvent] = []
    for visitor_index, visitor in enumerate(("v1", "v2", "v3", "v4")):
        rows.append(_event(f"{visitor}-a", visitor, "alpha", 1 + visitor_index))
        rows.append(_event(f"{visitor}-b", visitor, "beta", 2 + visitor_index))
    rows.append(_event("gamma-v2", "v2", "gamma", 6))
    rows.append(_event("gamma-v3", "v3", "gamma", 7))
    rows.append(_event("hold-v1", "v1", "gamma", 40))
    rows.append(_event("hold-v4", "v4", "gamma", 41))
    path = tmp_path / "events.jsonl"
    path.write_text(
        "".join(json.dumps(event.to_dict()) + "\n" for event in rows),
        encoding="utf-8",
    )
    report = evaluate(path, k=2, source="synthetic")
    models = report["models"]
    assert isinstance(models, dict)
    neural = models["neural"]
    popularity = models["popularity"]
    assert isinstance(neural, dict)
    assert isinstance(popularity, dict)
    assert neural["score_kind"] == "product_embedding_cosine"
    assert neural["evaluated_queries"] == popularity["evaluated_queries"]
    assert report["synthetic"] is True
    assert "not customer performance" in str(report["warning"])
    assert "valid result" in str(report["comparison_note"])

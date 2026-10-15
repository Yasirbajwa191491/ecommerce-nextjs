"""Temporal evaluation without future leakage."""

from datetime import UTC, datetime, timedelta

import pytest

from app.ml.behavioral.preprocess import Interaction
from app.ml.behavioral.schema import BehavioralEvent
from app.ml.errors import TrainingError
from evaluation.behavioral import (
    assert_no_future_leakage,
    evaluation_queries,
    popularity_recommend,
    score_ranker,
    temporal_split,
)
from evaluation.metrics import hit_rate_at_k, ndcg_at_k, precision_at_k, recall_at_k


def _event(
    event_id: str, visitor: str, product: str, day: int, event_type: str = "product_view"
) -> BehavioralEvent:
    return BehavioralEvent(
        event_id=event_id,
        event_type=event_type,
        product_id=product,
        visitor_id=visitor,
        occurred_at=datetime(2024, 1, 1, tzinfo=UTC) + timedelta(days=day),
        platform="web",
        placement=None,
        model_version=None,
        source="synthetic",
        order_id="order-1" if event_type == "purchase" else None,
    )


def test_temporal_split_does_not_leak_future_events() -> None:
    events = [
        _event("e1", "visitor-a", "a", 1),
        _event("e2", "visitor-a", "b", 10, "purchase"),
        _event("e3", "visitor-b", "a", 2),
        _event("e4", "visitor-b", "b", 3),
    ]
    split = temporal_split(events, quantile=0.8)
    assert_no_future_leakage(split)
    assert all(event.occurred_at < split.cutoff for event in split.train_events)
    assert all(event.occurred_at >= split.cutoff for event in split.test_events)
    queries = evaluation_queries(split.train_events, split.test_events)
    train_pairs = {(event.visitor_id, event.product_id) for event in split.train_events}
    for query in queries:
        for product_id in query.relevant_product_ids:
            assert (query.visitor_id, product_id) not in train_pairs


def test_metrics_and_empty_evaluation() -> None:
    assert precision_at_k(["b", "c"], {"b"}, 2) == 0.5
    assert recall_at_k(["b"], {"b", "c"}, 1) == 0.5
    assert hit_rate_at_k(["c"], {"b"}, 1) == 0.0
    assert ndcg_at_k(["b"], {"b"}, 1) == 1.0
    with pytest.raises(ValueError):
        precision_at_k(["b"], set(), 1)
    empty = score_ranker([], lambda _product, _k: [], k=5, catalog_ids=["a"])
    assert empty["insufficient_data"] is True


def test_collaborative_signal_can_beat_popularity() -> None:
    train = [
        _event("u2a", "u2", "a", 1),
        _event("u2b", "u2", "b", 2),
        _event("u3a", "u3", "a", 3),
        _event("u3b", "u3", "b", 4),
        _event("u1a", "u1", "a", 5),
        _event("c1", "u4", "c", 6),
        _event("c2", "u5", "c", 7),
        _event("c3", "u6", "c", 8),
    ]
    test = [_event("hold", "u1", "b", 20, "purchase")]
    queries = evaluation_queries(train, test)
    assert queries
    assert queries[0].query_product_id == "a"
    assert "b" in queries[0].relevant_product_ids
    interactions = [
        Interaction(event.visitor_id, event.product_id, 1.0, (event.event_type,)) for event in train
    ]
    from app.ml.models.collaborative_recommender import CollaborativeRecommender

    model = CollaborativeRecommender()
    model.fit(interactions, dataset_fingerprint="eval", min_product_interactions=1)

    def collaborative(product_id: str, k: int) -> list[str]:
        try:
            return [item.product_id for item in model.recommend(product_id, k).recommendations]
        except TrainingError:
            return []

    popularity = score_ranker(
        queries, popularity_recommend(interactions), k=1, catalog_ids=["a", "b", "c"]
    )
    learned = score_ranker(queries, collaborative, k=1, catalog_ids=["a", "b", "c"])
    assert learned["hit_rate_at_k"] >= popularity["hit_rate_at_k"]
    assert learned["coverage"] >= 0

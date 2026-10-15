"""Temporal offline evaluation for behavioral recommenders.

Training interactions are strictly earlier than the cutoff. Held-out relevance
is a later product the same visitor interacted with and had not already
interacted with before the cutoff. Agreement with another ranker is not a
quality label. These scores do not estimate revenue.
"""

import math
import time
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime

from app.ml.behavioral.preprocess import Interaction
from app.ml.behavioral.schema import BehavioralEvent
from app.ml.errors import TrainingError
from evaluation.metrics import coverage, hit_rate_at_k, ndcg_at_k, precision_at_k, recall_at_k


@dataclass(frozen=True)
class EvaluationQuery:
    visitor_id: str
    query_product_id: str
    relevant_product_ids: tuple[str, ...]
    cold_start: bool


@dataclass(frozen=True)
class Split:
    cutoff: datetime
    train_events: list[BehavioralEvent]
    test_events: list[BehavioralEvent]


def temporal_split(events: list[BehavioralEvent], *, quantile: float = 0.8) -> Split:
    if not events:
        raise TrainingError("Cannot split an empty event list")
    if not math.isfinite(quantile) or quantile <= 0 or quantile >= 1:
        raise TrainingError("Temporal quantile must be between 0 and 1")
    ordered = sorted(events, key=lambda item: (item.occurred_at, item.event_id))
    index = min(len(ordered) - 1, max(0, math.floor(quantile * (len(ordered) - 1))))
    cutoff = ordered[index].occurred_at
    train = [event for event in ordered if event.occurred_at < cutoff]
    test = [event for event in ordered if event.occurred_at >= cutoff]
    return Split(cutoff=cutoff, train_events=train, test_events=test)


def evaluation_queries(
    train_events: list[BehavioralEvent],
    test_events: list[BehavioralEvent],
) -> list[EvaluationQuery]:
    train_products: dict[str, list[BehavioralEvent]] = defaultdict(list)
    for event in train_events:
        train_products[event.visitor_id].append(event)
    test_products: dict[str, set[str]] = defaultdict(set)
    for event in test_events:
        test_products[event.visitor_id].add(event.product_id)
    queries: list[EvaluationQuery] = []
    for visitor_id in sorted(test_products):
        history = train_products.get(visitor_id, [])
        if not history:
            continue
        known = {event.product_id for event in history}
        relevant = tuple(sorted(test_products[visitor_id] - known))
        if not relevant:
            continue
        anchor = max(history, key=lambda item: (item.occurred_at, item.product_id))
        queries.append(
            EvaluationQuery(
                visitor_id=visitor_id,
                query_product_id=anchor.product_id,
                relevant_product_ids=relevant,
                cold_start=len(history) < 2,
            )
        )
    return queries


def score_ranker(
    queries: list[EvaluationQuery],
    recommend,
    *,
    k: int,
    catalog_ids: list[str],
) -> dict[str, object]:
    if k < 1:
        raise TrainingError("k must be at least 1")
    if not queries:
        return {
            "available": True,
            "insufficient_data": True,
            "evaluated_queries": 0,
            "reason": "insufficient_data",
        }
    precision_values: list[float] = []
    recall_values: list[float] = []
    hit_values: list[float] = []
    ndcg_values: list[float] = []
    lists: list[list[str]] = []
    cold_hits: list[float] = []
    started = time.perf_counter()
    for query in queries:
        recommended = list(recommend(query.query_product_id, k))
        lists.append(recommended)
        precision_values.append(precision_at_k(recommended, query.relevant_product_ids, k))
        recall_values.append(recall_at_k(recommended, query.relevant_product_ids, k))
        hit_values.append(hit_rate_at_k(recommended, query.relevant_product_ids, k))
        ndcg_values.append(ndcg_at_k(recommended, query.relevant_product_ids, k))
        if query.cold_start:
            cold_hits.append(hit_values[-1])
    elapsed_ms = (time.perf_counter() - started) * 1000 / len(queries)
    return {
        "available": True,
        "insufficient_data": False,
        "evaluated_queries": len(queries),
        "precision_at_k": _mean(precision_values),
        "recall_at_k": _mean(recall_values),
        "hit_rate_at_k": _mean(hit_values),
        "ndcg_at_k": _mean(ndcg_values),
        "coverage": coverage(lists, catalog_ids),
        "diversity": _diversity(lists),
        "cold_start_queries": len(cold_hits),
        "cold_start_hit_rate_at_k": _mean(cold_hits) if cold_hits else None,
        "mean_latency_ms": round(elapsed_ms, 3),
    }


def popularity_recommend(
    train_interactions: list[Interaction],
):
    totals: dict[str, float] = defaultdict(float)
    for item in train_interactions:
        totals[item.product_id] += item.weight
    ranking = sorted(totals, key=lambda product_id: (-totals[product_id], product_id))

    def recommend(product_id: str, k: int) -> list[str]:
        return [item for item in ranking if item != product_id][:k]

    return recommend


def assert_no_future_leakage(split: Split) -> None:
    if any(event.occurred_at >= split.cutoff for event in split.train_events):
        raise TrainingError("Training split contains a future event")
    if any(event.occurred_at < split.cutoff for event in split.test_events):
        raise TrainingError("Test split contains a past event")


def _mean(values: list[float]) -> float:
    return round(sum(values) / len(values), 6)


def _diversity(lists: list[list[str]]) -> float:
    """Mean share of unique products inside each list. 1 means no repeated ids."""

    ratios: list[float] = []
    for items in lists:
        if not items:
            continue
        ratios.append(len(set(items)) / len(items))
    if not ratios:
        return 0.0
    return round(sum(ratios) / len(ratios), 6)

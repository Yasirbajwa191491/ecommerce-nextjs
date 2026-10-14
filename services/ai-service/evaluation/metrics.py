"""Ranking metrics for offline recommendation evaluation.

Precision@K uses K as the denominator, including when the list is shorter than K.
Recall@K uses the size of the relevance set. HitRate@K is 1 when any recommended
item is relevant. Queries with an empty relevance set are omitted from those
three averages so the denominator is the number of queries that have labels.

Coverage uses the eligible catalog size as the denominator.
"""

from collections.abc import Collection, Sequence
from dataclasses import dataclass


@dataclass(frozen=True)
class QualitySummary:
    precision_at_k: float
    recall_at_k: float
    hit_rate_at_k: float
    evaluated_queries: int
    skipped_empty_relevance: int


def precision_at_k(recommended: Sequence[str], relevant: Collection[str], k: int) -> float:
    if k < 1:
        raise ValueError("k must be at least 1")
    if not relevant:
        raise ValueError("relevance set is empty")
    hits = sum(1 for item in list(recommended)[:k] if item in relevant)
    return hits / k


def recall_at_k(recommended: Sequence[str], relevant: Collection[str], k: int) -> float:
    if k < 1:
        raise ValueError("k must be at least 1")
    if not relevant:
        raise ValueError("relevance set is empty")
    hits = sum(1 for item in list(recommended)[:k] if item in relevant)
    return hits / len(relevant)


def hit_rate_at_k(recommended: Sequence[str], relevant: Collection[str], k: int) -> float:
    if k < 1:
        raise ValueError("k must be at least 1")
    if not relevant:
        raise ValueError("relevance set is empty")
    window = list(recommended)[:k]
    return 1.0 if any(item in relevant for item in window) else 0.0


def ndcg_at_k(recommended: Sequence[str], relevant: Collection[str], k: int) -> float:
    """Binary NDCG. The ideal list places every relevant item first."""

    import math

    if k < 1:
        raise ValueError("k must be at least 1")
    if not relevant:
        raise ValueError("relevance set is empty")
    gain = 0.0
    for index, item in enumerate(list(recommended)[:k], start=1):
        if item in relevant:
            gain += 1.0 / math.log2(index + 1)
    ideal_count = min(k, len(relevant))
    ideal = sum(1.0 / math.log2(index + 1) for index in range(1, ideal_count + 1))
    return gain / ideal


def coverage(recommendation_lists: Sequence[Sequence[str]], catalog_ids: Collection[str]) -> float:
    catalog = set(catalog_ids)
    if not catalog:
        return 0.0
    recommended = {item for row in recommendation_lists for item in row}
    return len(recommended & catalog) / len(catalog)


def summarize_quality(
    cases: Sequence[tuple[Sequence[str], Collection[str]]],
    k: int,
) -> QualitySummary:
    evaluated: list[tuple[Sequence[str], Collection[str]]] = []
    skipped = 0
    for recommended, relevant in cases:
        if not relevant:
            skipped += 1
            continue
        evaluated.append((recommended, relevant))
    if not evaluated:
        return QualitySummary(0.0, 0.0, 0.0, 0, skipped)
    precision = sum(precision_at_k(recs, rel, k) for recs, rel in evaluated) / len(evaluated)
    recall = sum(recall_at_k(recs, rel, k) for recs, rel in evaluated) / len(evaluated)
    hit_rate = sum(hit_rate_at_k(recs, rel, k) for recs, rel in evaluated) / len(evaluated)
    return QualitySummary(precision, recall, hit_rate, len(evaluated), skipped)


def mean(values: Sequence[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)

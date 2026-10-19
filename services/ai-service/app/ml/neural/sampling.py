"""Negative sampling for implicit feedback.

An unobserved visitor-product pair is not a confirmed dislike. It is only a
training contrast. Sampling uses the positive pairs from the training period
that is passed in. It does not look at later events.
"""

import random
from collections import defaultdict
from dataclasses import dataclass

from app.ml.errors import TrainingError


@dataclass(frozen=True)
class PairExample:
    visitor_index: int
    product_index: int
    label: float
    weight: float


def sample_negatives(
    positives: list[tuple[int, int, float]],
    n_products: int,
    *,
    ratio: int,
    seed: int,
    sampler: str = "uniform",
    exclude: set[tuple[int, int]] | None = None,
) -> list[PairExample]:
    """Sample negatives for `positives`.

    `exclude` holds extra visitor-product pairs that must not be labeled
    negative, such as earlier training positives when sampling a validation set.
    Those pairs are not added as positives.
    """

    if n_products < 1:
        raise TrainingError("Cannot sample negatives without products")
    if ratio < 1:
        raise TrainingError("Negative ratio must be at least 1")
    if sampler not in {"uniform", "popularity"}:
        raise TrainingError("Negative sampler must be uniform or popularity")
    deduped = _dedupe_positives(positives)
    known: dict[int, set[int]] = defaultdict(set)
    for visitor, product, _weight in deduped:
        known[visitor].add(product)
    blocked: dict[int, set[int]] = defaultdict(set)
    for visitor, product in exclude or set():
        blocked[visitor].add(product)
    popularity = _popularity(deduped, n_products) if sampler == "popularity" else None
    rng = random.Random(seed)
    examples: list[PairExample] = []
    for visitor, product, weight in deduped:
        examples.append(PairExample(visitor, product, 1.0, weight))
        occupied = set(known[visitor])
        occupied.update(blocked[visitor])
        available = n_products - len(occupied)
        if available <= 0:
            continue
        target = min(ratio, available)
        chosen = _choose(
            rng,
            n_products=n_products,
            occupied=occupied,
            target=target,
            popularity=popularity,
        )
        for candidate in chosen:
            examples.append(PairExample(visitor, candidate, 0.0, 1.0))
    assert_no_label_conflict(examples)
    return examples


def assert_no_label_conflict(examples: list[PairExample]) -> None:
    positive = {(item.visitor_index, item.product_index) for item in examples if item.label == 1.0}
    negative = {(item.visitor_index, item.product_index) for item in examples if item.label == 0.0}
    if positive & negative:
        raise TrainingError("A known positive was sampled as a negative")


def _dedupe_positives(
    positives: list[tuple[int, int, float]],
) -> list[tuple[int, int, float]]:
    best: dict[tuple[int, int], float] = {}
    for visitor, product, weight in positives:
        if weight <= 0:
            raise TrainingError("Positive interaction weights must be positive")
        key = (visitor, product)
        best[key] = max(best.get(key, 0.0), weight)
    return [(visitor, product, weight) for (visitor, product), weight in sorted(best.items())]


def _popularity(positives: list[tuple[int, int, float]], n_products: int) -> list[float]:
    counts = [0.0] * n_products
    for _visitor, product, _weight in positives:
        if product < 0 or product >= n_products:
            raise TrainingError("Product index is outside the training catalog")
        counts[product] += 1.0
    return counts


def _choose(
    rng: random.Random,
    *,
    n_products: int,
    occupied: set[int],
    target: int,
    popularity: list[float] | None,
) -> list[int]:
    chosen: list[int] = []
    chosen_set: set[int] = set()
    attempts = 0
    max_attempts = target * 20 + n_products
    while len(chosen) < target and attempts < max_attempts:
        attempts += 1
        candidate = (
            _weighted_draw(rng, popularity, occupied | chosen_set)
            if popularity is not None
            else rng.randrange(n_products)
        )
        if candidate is None or candidate in occupied or candidate in chosen_set:
            continue
        chosen.append(candidate)
        chosen_set.add(candidate)
    if len(chosen) < target:
        remaining = [
            index
            for index in range(n_products)
            if index not in occupied and index not in chosen_set
        ]
        rng.shuffle(remaining)
        for candidate in remaining:
            if len(chosen) >= target:
                break
            chosen.append(candidate)
    return sorted(chosen)


def _weighted_draw(
    rng: random.Random,
    weights: list[float],
    blocked: set[int],
) -> int | None:
    total = 0.0
    for index, weight in enumerate(weights):
        if index in blocked or weight <= 0:
            continue
        total += weight
    if total <= 0:
        return None
    draw = rng.random() * total
    cursor = 0.0
    for index, weight in enumerate(weights):
        if index in blocked or weight <= 0:
            continue
        cursor += weight
        if draw <= cursor:
            return index
    return None

"""Build neural training examples from the Phase 3 interaction contract.

The outer caller must already remove future events. This module then holds out
the latest slice of the remaining events for validation and samples negatives
only from products known in the fitting slice.
"""

from dataclasses import dataclass
from datetime import datetime

from app.ml.behavioral.preprocess import Interaction, aggregate_events, interaction_fingerprint
from app.ml.behavioral.schema import BehavioralEvent
from app.ml.behavioral.weights import WeightConfig, weight_config
from app.ml.errors import TrainingError
from app.ml.neural.config import NeuralModelConfig
from app.ml.neural.sampling import PairExample, sample_negatives
from evaluation.behavioral import assert_no_future_leakage, temporal_split


@dataclass(frozen=True)
class PreparedNeuralData:
    fit_events: list[BehavioralEvent]
    validation_events: list[BehavioralEvent]
    fit_interactions: list[Interaction]
    validation_interactions: list[Interaction]
    visitor_ids: list[str]
    product_ids: list[str]
    catalog_ids: list[str]
    train_examples: list[PairExample]
    validation_examples: list[PairExample]
    fingerprint: str
    weight_config: WeightConfig
    validation_cutoff: str

    @property
    def positive_count(self) -> int:
        return sum(1 for item in self.train_examples if item.label == 1.0)

    @property
    def negative_count(self) -> int:
        return sum(1 for item in self.train_examples if item.label == 0.0)


def prepare_neural_data(
    train_events: list[BehavioralEvent],
    *,
    catalog_ids: list[str],
    config: NeuralModelConfig,
) -> PreparedNeuralData:
    config.validated()
    if len(train_events) < 4:
        raise TrainingError("Not enough training events for a neural validation split")
    weights = weight_config(config.weight_scheme)
    inner = temporal_split(train_events, quantile=config.validation_quantile)
    assert_no_future_leakage(inner)
    if not inner.train_events or not inner.test_events:
        raise TrainingError("Neural validation split did not leave both a fit set and a holdout")
    catalog = sorted(set(catalog_ids))
    fit_interactions, _fit_report = aggregate_events(
        inner.train_events,
        weights,
        catalog_ids=set(catalog) if catalog else None,
    )
    validation_interactions, _validation_report = aggregate_events(
        inner.test_events,
        weights,
        catalog_ids=set(catalog) if catalog else None,
    )
    fit_pairs = {(item.visitor_id, item.product_id) for item in fit_interactions}
    validation_interactions = [
        item
        for item in validation_interactions
        if (item.visitor_id, item.product_id) not in fit_pairs
    ]
    visitor_ids, product_ids = _indexes(fit_interactions)
    if len(visitor_ids) < 1 or len(product_ids) < 2:
        raise TrainingError("Neural training needs at least one visitor and two products")
    visitor_index = {visitor_id: index for index, visitor_id in enumerate(visitor_ids)}
    product_index = {product_id: index for index, product_id in enumerate(product_ids)}
    fit_encoded = _encode(fit_interactions, visitor_index, product_index)
    validation_encoded = _encode(validation_interactions, visitor_index, product_index)
    validation_events = list(inner.test_events)
    if not validation_encoded:
        original_fit = list(fit_interactions)
        fit_interactions, moved = _hold_out_latest_pairs(inner.train_events, original_fit)
        visitor_ids, product_ids = _indexes(original_fit)
        if len(product_ids) < 2 or not visitor_ids:
            raise TrainingError("Neural training needs at least one visitor and two products")
        visitor_index = {visitor_id: index for index, visitor_id in enumerate(visitor_ids)}
        product_index = {product_id: index for index, product_id in enumerate(product_ids)}
        fit_encoded = _encode(fit_interactions, visitor_index, product_index)
        validation_interactions = moved
        validation_encoded = _encode(moved, visitor_index, product_index)
        moved_pairs = {(item.visitor_id, item.product_id) for item in moved}
        validation_events = [
            event
            for event in inner.train_events
            if (event.visitor_id, event.product_id) in moved_pairs
        ]
    if len(fit_encoded) < 2:
        raise TrainingError("Not enough fitting interactions for the neural model")
    if not validation_encoded:
        raise TrainingError(
            "Not enough held-out training interactions to validate the neural model"
        )
    train_examples = sample_negatives(
        fit_encoded,
        len(product_ids),
        ratio=config.negative_ratio,
        seed=config.seed,
        sampler=config.sampler,
    )
    fit_pair_ids = {(visitor, product) for visitor, product, _weight in fit_encoded}
    validation_examples = sample_negatives(
        validation_encoded,
        len(product_ids),
        ratio=config.negative_ratio,
        seed=config.seed + 1,
        sampler=config.sampler,
        exclude=fit_pair_ids,
    )
    _reject_blocked_negatives(validation_examples, fit_encoded + validation_encoded)
    catalog_known = sorted(set(catalog) | set(product_ids))
    return PreparedNeuralData(
        fit_events=list(inner.train_events),
        validation_events=validation_events,
        fit_interactions=fit_interactions,
        validation_interactions=validation_interactions,
        visitor_ids=visitor_ids,
        product_ids=product_ids,
        catalog_ids=catalog_known,
        train_examples=train_examples,
        validation_examples=validation_examples,
        fingerprint=interaction_fingerprint(fit_interactions, weights),
        weight_config=weights,
        validation_cutoff=inner.cutoff.strftime("%Y-%m-%dT%H:%M:%SZ"),
    )


def _indexes(interactions: list[Interaction]) -> tuple[list[str], list[str]]:
    visitors = sorted({item.visitor_id for item in interactions})
    products = sorted({item.product_id for item in interactions})
    return visitors, products


def _hold_out_latest_pairs(
    fit_events: list[BehavioralEvent],
    fit_interactions: list[Interaction],
) -> tuple[list[Interaction], list[Interaction]]:
    """Move each visitor's latest product out of the fit set when time split adds no new pair.

    The moved pair is still inside the training period. It is not a future event.
    """

    latest: dict[str, tuple[datetime, str]] = {}
    for event in fit_events:
        current = latest.get(event.visitor_id)
        if current is None or event.occurred_at > current[0]:
            latest[event.visitor_id] = (event.occurred_at, event.product_id)
    products_by_visitor: dict[str, set[str]] = {}
    for item in fit_interactions:
        products_by_visitor.setdefault(item.visitor_id, set()).add(item.product_id)
    moved_pairs: set[tuple[str, str]] = set()
    for visitor_id, (_occurred_at, product_id) in latest.items():
        if len(products_by_visitor.get(visitor_id, set())) >= 2:
            moved_pairs.add((visitor_id, product_id))
    kept = [
        item for item in fit_interactions if (item.visitor_id, item.product_id) not in moved_pairs
    ]
    moved = [item for item in fit_interactions if (item.visitor_id, item.product_id) in moved_pairs]
    return kept, moved


def _encode(
    interactions: list[Interaction],
    visitor_index: dict[str, int],
    product_index: dict[str, int],
) -> list[tuple[int, int, float]]:
    encoded: list[tuple[int, int, float]] = []
    for item in interactions:
        visitor = visitor_index.get(item.visitor_id)
        product = product_index.get(item.product_id)
        if visitor is None or product is None:
            continue
        encoded.append((visitor, product, item.weight))
    return encoded


def _reject_blocked_negatives(
    examples: list[PairExample],
    blocked: list[tuple[int, int, float]],
) -> None:
    positive_pairs = {(visitor, product) for visitor, product, _weight in blocked}
    leaked = [
        (item.visitor_index, item.product_index)
        for item in examples
        if item.label == 0.0 and (item.visitor_index, item.product_index) in positive_pairs
    ]
    if leaked:
        raise TrainingError("Validation negatives include a known positive pair")

"""Fit a neural model on events that are already limited to the training period."""

import platform
import sys
from datetime import datetime

import torch

from app.ml.behavioral.schema import BehavioralEvent
from app.ml.errors import TrainingError
from app.ml.models.neural_recommender import NeuralRecommender
from app.ml.neural.config import NeuralModelConfig
from app.ml.neural.data import PreparedNeuralData, prepare_neural_data
from app.ml.neural.trainer import TrainingHistory, train_matrix_factorization
from evaluation.behavioral import Split, assert_no_future_leakage, temporal_split


def hold_out_future_events(events: list[BehavioralEvent], *, quantile: float = 0.8) -> Split:
    """Drop the latest events before any neural fitting or negative sampling."""

    split = temporal_split(events, quantile=quantile)
    assert_no_future_leakage(split)
    if not split.train_events or not split.test_events:
        raise TrainingError("Temporal split did not produce both training and held-out events")
    return split


def fit_neural_model(
    train_events: list[BehavioralEvent],
    *,
    catalog_ids: list[str],
    config: NeuralModelConfig,
    held_out_events: int = 0,
    outer_cutoff: datetime | None = None,
) -> tuple[NeuralRecommender, dict[str, object]]:
    prepared = prepare_neural_data(train_events, catalog_ids=catalog_ids, config=config)
    if outer_cutoff is not None:
        if any(event.occurred_at >= outer_cutoff for event in prepared.fit_events):
            raise TrainingError("Fitting events include the held-out period")
        if any(event.occurred_at >= outer_cutoff for event in prepared.validation_events):
            raise TrainingError("Validation events include the held-out period")
    module, history = train_matrix_factorization(
        n_visitors=len(prepared.visitor_ids),
        n_products=len(prepared.product_ids),
        train_examples=prepared.train_examples,
        validation_examples=prepared.validation_examples,
        config=config,
    )
    recommender = NeuralRecommender()
    recommender.bind(
        module,
        visitor_ids=prepared.visitor_ids,
        product_ids=prepared.product_ids,
        catalog_ids=prepared.catalog_ids,
        dataset_fingerprint=prepared.fingerprint,
        trained_at="",
        validation_loss=history.best_validation_loss,
        metadata=history.to_dict(),
    )
    report = _report(prepared, history, config, held_out_events, outer_cutoff)
    return recommender, report


def _report(
    prepared: PreparedNeuralData,
    history: TrainingHistory,
    config: NeuralModelConfig,
    held_out_events: int,
    outer_cutoff: datetime | None,
) -> dict[str, object]:
    cutoff = ""
    if outer_cutoff is not None:
        cutoff = outer_cutoff.strftime("%Y-%m-%dT%H:%M:%SZ")
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    return {
        "model_version": "neural-v1",
        "score_kind": "product_embedding_cosine",
        "objective": "binary_cross_entropy_with_logits",
        "seed": config.seed,
        "python_version": python_version,
        "pytorch_version": torch.__version__,
        "platform": platform.platform(),
        "device": history.device,
        "config": config.to_dict(),
        "dataset_fingerprint": prepared.fingerprint,
        "outer_cutoff": cutoff,
        "validation_cutoff": prepared.validation_cutoff,
        "fit_events": len(prepared.fit_events),
        "validation_events": len(prepared.validation_events),
        "held_out_events": held_out_events,
        "training_examples": len(prepared.train_examples),
        "positive_count": prepared.positive_count,
        "negative_count": prepared.negative_count,
        "product_count": len(prepared.catalog_ids),
        "embedded_product_count": len(prepared.product_ids),
        "visitor_count": len(prepared.visitor_ids),
        "epochs_ran": history.epochs_ran,
        "best_epoch": history.best_epoch,
        "best_validation_loss": history.best_validation_loss,
        "stopped_early": history.stopped_early,
        "train_loss": list(history.train_loss),
        "validation_loss": list(history.validation_loss),
        "training_seconds": history.training_seconds,
        "nondeterminism": (
            "The same seed, code, and PyTorch build on CPU should repeat. "
            "A different machine or PyTorch version can change the weights."
        ),
        "negative_sampling_note": (
            "Unobserved interactions are contrastive samples, not confirmed negative preferences."
        ),
        "serving_note": (
            "Public inference ranks products by cosine similarity of learned "
            "product embeddings. It does not require a visitor id and does not "
            "return a purchase probability."
        ),
    }

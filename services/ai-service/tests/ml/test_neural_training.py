"""Dataset, negative sampling, training, and artifact publication."""

from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
import torch

from app.ml.behavioral.schema import BehavioralEvent
from app.ml.errors import ArtifactError, TrainingError
from app.ml.models.neural_artifacts import load_neural, save_neural_artifacts
from app.ml.neural.config import NeuralModelConfig
from app.ml.neural.data import prepare_neural_data
from app.ml.neural.pipeline import fit_neural_model
from app.ml.neural.sampling import assert_no_label_conflict, sample_negatives


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


def _events() -> list[BehavioralEvent]:
    rows = [
        _event("v1-alpha", "v1", "alpha", 1),
        _event("v1-beta", "v1", "beta", 2),
        _event("v2-alpha", "v2", "alpha", 2),
        _event("v2-gamma", "v2", "gamma", 2),
        _event("v2-beta", "v2", "beta", 3),
        _event("v3-gamma", "v3", "gamma", 3),
        _event("v3-alpha", "v3", "alpha", 3),
        _event("v3-beta", "v3", "beta", 4),
        _event("v4-alpha", "v4", "alpha", 4),
        _event("v4-beta", "v4", "beta", 5),
        _event("late-v1", "v1", "gamma", 30),
        _event("late-v4", "v4", "gamma", 31),
    ]
    return rows


def _config(**overrides: object) -> NeuralModelConfig:
    values: dict[str, object] = {
        "embedding_dim": 4,
        "hidden_sizes": (4,),
        "dropout": 0.0,
        "learning_rate": 0.05,
        "batch_size": 8,
        "epochs": 3,
        "negative_ratio": 1,
        "seed": 7,
        "patience": 2,
        "device": "cpu",
    }
    values.update(overrides)
    return NeuralModelConfig(**values)  # type: ignore[arg-type]


def test_negative_samples_do_not_reuse_positives_or_loop_forever() -> None:
    positives = [(0, 0, 1.0), (0, 1, 2.0), (1, 0, 1.0)]
    examples = sample_negatives(positives, 3, ratio=2, seed=3)
    assert_no_label_conflict(examples)
    positives_pairs = {
        (item.visitor_index, item.product_index) for item in examples if item.label == 1
    }
    negative_pairs = {
        (item.visitor_index, item.product_index) for item in examples if item.label == 0
    }
    assert positives_pairs.isdisjoint(negative_pairs)
    saturated = sample_negatives([(0, 0, 1.0), (0, 1, 1.0)], 2, ratio=4, seed=1)
    assert all(item.label == 1.0 for item in saturated if item.visitor_index == 0)
    again = sample_negatives(positives, 3, ratio=2, seed=3)
    assert [(item.visitor_index, item.product_index, item.label) for item in examples] == [
        (item.visitor_index, item.product_index, item.label) for item in again
    ]


def test_popularity_sampling_is_optional_and_still_excludes_positives() -> None:
    positives = [(0, 0, 1.0), (1, 0, 1.0), (1, 1, 1.0)]
    examples = sample_negatives(positives, 4, ratio=2, seed=5, sampler="popularity")
    assert_no_label_conflict(examples)
    assert any(item.label == 0.0 for item in examples)


def test_preparation_keeps_validation_before_any_later_holdout() -> None:
    prepared = prepare_neural_data(
        _events(),
        catalog_ids=["alpha", "beta", "gamma", "delta"],
        config=_config(),
    )
    assert prepared.fit_events
    assert prepared.validation_events
    assert max(event.occurred_at for event in prepared.fit_events) < min(
        event.occurred_at for event in prepared.validation_events
    )
    assert prepared.positive_count > 0
    assert prepared.negative_count > 0
    assert "delta" in prepared.catalog_ids
    assert "delta" not in prepared.product_ids
    positive_pairs = {
        (item.visitor_index, item.product_index)
        for item in prepared.validation_examples
        if item.label == 1.0
    }
    fit_pairs = {
        (item.visitor_index, item.product_index)
        for item in prepared.train_examples
        if item.label == 1.0
    }
    negative_pairs = {
        (item.visitor_index, item.product_index)
        for item in prepared.validation_examples
        if item.label == 0.0
    }
    assert negative_pairs.isdisjoint(positive_pairs | fit_pairs)


def test_training_is_reproducible_and_publishes_a_checkpoint(tmp_path: Path) -> None:
    config = _config()
    first, report = fit_neural_model(
        _events(),
        catalog_ids=["alpha", "beta", "gamma", "delta"],
        config=config,
    )
    second, _again = fit_neural_model(
        _events(),
        catalog_ids=["alpha", "beta", "gamma", "delta"],
        config=config,
    )
    assert first.module is not None and second.module is not None
    left = first.module.product_embedding.weight.detach()
    right = second.module.product_embedding.weight.detach()
    assert torch.allclose(left, right)
    assert report["device"] == "cpu"
    losses = report["validation_loss"]
    assert isinstance(losses, list)
    from app.ml.neural.trainer import best_epoch_index

    assert (
        report["best_epoch"]
        == best_epoch_index([float(loss) for loss in losses], config.min_delta) + 1
    )
    destination = tmp_path / "neural-v1"
    manifest = save_neural_artifacts(
        destination,
        first,
        dataset_source="synthetic",
        report=report,
        trained_at="2024-02-01T00:00:00+00:00",
    )
    loaded, loaded_manifest = load_neural(destination, trusted=True)
    assert loaded_manifest["model_version"] == "neural-v1"
    assert manifest["serialization"] == "torch_state_dict"
    assert loaded.recommend("alpha", 2).recommendations
    with pytest.raises(ArtifactError, match="content-v1"):
        save_neural_artifacts(
            tmp_path / "content-v1",
            first,
            dataset_source="synthetic",
            report=report,
        )
    with pytest.raises(ArtifactError):
        load_neural(destination, trusted=False)


def test_invalid_config_is_rejected() -> None:
    with pytest.raises(TrainingError):
        _config(epochs=0).validated()

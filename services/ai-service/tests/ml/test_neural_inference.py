"""Neural item-to-item inference, including unsafe artifacts and cache reuse."""

import json
import threading
from pathlib import Path

import pytest

from app.ml.errors import (
    ArtifactError,
    IncompatibleArtifactError,
    TrainingError,
    UnknownProductError,
)
from app.ml.inference.neural import open_cached_neural_model
from app.ml.models.neural_artifacts import save_neural_artifacts
from app.ml.neural.config import NeuralModelConfig
from app.ml.neural.pipeline import fit_neural_model
from tests.ml.test_neural_training import _events


def _publish(tmp_path: Path) -> Path:
    model, report = fit_neural_model(
        _events(),
        catalog_ids=["alpha", "beta", "gamma", "delta"],
        config=NeuralModelConfig(
            embedding_dim=4,
            hidden_sizes=(4,),
            dropout=0.0,
            epochs=2,
            patience=1,
            negative_ratio=1,
            batch_size=8,
            seed=7,
            device="cpu",
        ),
    )
    destination = tmp_path / "neural-v1"
    save_neural_artifacts(
        destination,
        model,
        dataset_source="synthetic",
        report=report,
        trained_at="2024-02-01T00:00:00+00:00",
    )
    return destination


def test_ranking_is_bounded_deterministic_and_model_derived(tmp_path: Path) -> None:
    model = open_cached_neural_model(type("State", (), {})(), str(_publish(tmp_path)))
    first = model.recommend("alpha", 2)
    second = model.recommend("alpha", 2)
    assert first.score_kind == "product_embedding_cosine"
    assert [item.product_id for item in first.recommendations] == [
        item.product_id for item in second.recommendations
    ]
    assert [item.score for item in first.recommendations] == [
        item.score for item in second.recommendations
    ]
    assert all(item.product_id != "alpha" for item in first.recommendations)
    assert len(model.recommend("alpha", 1).recommendations) == 1
    cold = model.recommend("delta", 2)
    assert cold.cold_start is True
    assert cold.recommendations == ()
    with pytest.raises(UnknownProductError):
        model.recommend("missing", 2)
    with pytest.raises(TrainingError, match="top_k"):
        model.recommend("alpha", 101)
    logit = model.interaction_logit("v1", "alpha")
    assert logit is not None
    assert model.interaction_logit("nobody", "alpha") is None


def test_missing_corrupt_and_incompatible_artifacts(tmp_path: Path) -> None:
    with pytest.raises(ArtifactError):
        open_cached_neural_model(type("State", (), {})(), str(tmp_path / "missing"))
    destination = _publish(tmp_path / "good")
    manifest_path = destination / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["files"]["weights.pt"]["sha256"] = "0" * 64
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(ArtifactError, match="checksum"):
        open_cached_neural_model(type("State", (), {})(), str(destination))
    fresh = _publish(tmp_path / "fresh")
    manifest = json.loads((fresh / "manifest.json").read_text(encoding="utf-8"))
    manifest["model_version"] = "content-v1"
    (fresh / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(IncompatibleArtifactError):
        open_cached_neural_model(type("State", (), {})(), str(fresh))


def test_concurrent_loads_share_one_model(tmp_path: Path) -> None:
    directory = _publish(tmp_path)
    state = type("State", (), {})()
    loaded: list[int] = []

    def load() -> None:
        loaded.append(id(open_cached_neural_model(state, str(directory))))

    threads = [threading.Thread(target=load) for _ in range(6)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert len(set(loaded)) == 1

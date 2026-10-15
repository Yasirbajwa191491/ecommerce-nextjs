"""Item-item collaborative filtering on a sparse implicit matrix."""

import math
from pathlib import Path

import pytest

from app.ml.behavioral.preprocess import Interaction
from app.ml.behavioral.weights import weight_config
from app.ml.errors import ArtifactError, TrainingError, UnknownProductError
from app.ml.models.behavioral_artifacts import load_collaborative, save_collaborative_artifacts
from app.ml.models.collaborative_recommender import CollaborativeRecommender


def _interactions() -> list[Interaction]:
    return [
        Interaction("visitor-a", "p", 1.0, ("product_view",)),
        Interaction("visitor-a", "q", 1.0, ("product_view",)),
        Interaction("visitor-b", "p", 1.0, ("product_view",)),
        Interaction("visitor-b", "q", 1.0, ("product_view",)),
        Interaction("visitor-c", "q", 1.0, ("product_view",)),
        Interaction("visitor-c", "r", 1.0, ("product_view",)),
    ]


def _fit() -> CollaborativeRecommender:
    model = CollaborativeRecommender()
    model.fit(
        _interactions(),
        dataset_fingerprint="fingerprint",
        catalog_ids=["p", "q", "r", "cold"],
        min_product_interactions=1,
        max_neighbors=10,
    )
    return model


def test_sparse_item_similarity_excludes_self_and_is_deterministic() -> None:
    model = _fit()
    assert model.summary is not None
    assert model.summary.matrix_sparsity > 0
    first = model.recommend("p", top_k=5)
    second = _fit().recommend("p", top_k=5)
    assert [item.product_id for item in first.recommendations] == ["q"]
    assert first.recommendations[0].score == pytest.approx(0.816497, abs=1e-5)
    assert all(item.product_id != "p" for item in first.recommendations)
    assert [item.to_dict() for item in first.recommendations] == [
        item.to_dict() for item in second.recommendations
    ]
    assert all(math.isfinite(item.score) for item in first.recommendations)


def test_unknown_cold_and_bounds() -> None:
    model = _fit()
    with pytest.raises(UnknownProductError):
        model.recommend("missing")
    assert model.recommend("cold", top_k=5).recommendations == ()
    sparse = model.recommend("r", top_k=5)
    assert [item.product_id for item in sparse.recommendations] == ["q"]
    assert len(model.recommend("p", top_k=1).recommendations) == 1
    with pytest.raises(TrainingError):
        model.recommend("p", top_k=0)
    with pytest.raises(TrainingError):
        model.recommend("p", top_k=101)


def test_artifact_round_trip_refuses_content_directory(tmp_path: Path) -> None:
    model = _fit()
    assert model.summary is not None
    manifest = save_collaborative_artifacts(
        tmp_path / "collaborative-v1",
        model,
        model.summary,
        dataset_source="synthetic",
        weighting=weight_config().to_dict(),
        trained_at="2024-01-01T00:00:00+00:00",
    )
    loaded, loaded_manifest = load_collaborative(tmp_path / "collaborative-v1", trusted=True)
    assert loaded.recommend("p", 1).recommendations[0].product_id == "q"
    assert loaded_manifest["model_version"] == "collaborative-v1"
    assert manifest["dataset_fingerprint"] == "fingerprint"
    with pytest.raises(ArtifactError):
        save_collaborative_artifacts(
            tmp_path / "content-v1",
            model,
            model.summary,
            dataset_source="synthetic",
            weighting={},
        )

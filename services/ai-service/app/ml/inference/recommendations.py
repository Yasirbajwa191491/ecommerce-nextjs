"""Model interface used by the CLI, evaluation, and tests.

This module does not start FastAPI and does not connect to Convex.
"""

import threading
from pathlib import Path
from typing import Any

from app.ml.models.artifacts import load_recommender
from app.ml.models.content_recommender import (
    ContentRecommender,
    RecommendationResult,
)

_CONTENT_LOAD_LOCK = threading.Lock()


class RecommendationModel:
    """A loaded content model that can rank similar products."""

    def __init__(self, recommender: ContentRecommender, manifest: dict[str, Any]) -> None:
        self._recommender = recommender
        self.manifest = manifest

    @classmethod
    def load(cls, path: Path, *, trusted: bool) -> "RecommendationModel":
        recommender, manifest = load_recommender(path, trusted=trusted)
        return cls(recommender, manifest)

    @property
    def model_version(self) -> str:
        return str(self.manifest["model_version"])

    @property
    def model_name(self) -> str:
        return str(self.manifest["model_name"])

    @property
    def dataset_fingerprint(self) -> str:
        return str(self.manifest["dataset_fingerprint"])

    @property
    def artifact_version(self) -> str:
        value = self.manifest.get("artifact_version")
        return str(value) if isinstance(value, str) and value else self.model_version

    @property
    def dataset_source(self) -> str:
        value = self.manifest.get("dataset_source")
        return str(value) if isinstance(value, str) and value else "synthetic"

    def recommend(self, product_id: str, top_k: int = 5) -> RecommendationResult:
        return self._recommender.recommend(product_id, top_k=top_k)

    def recommend_eligible(self, top_k: int) -> list[RecommendationResult]:
        results: list[RecommendationResult] = []
        for product_id, eligible in zip(
            self._recommender.product_ids,
            self._recommender.eligible,
            strict=True,
        ):
            if eligible:
                results.append(self.recommend(product_id, top_k))
        return results

    def pairwise_content_diversity(self, product_ids: list[str]) -> float | None:
        return self._recommender.pairwise_content_diversity(product_ids)


def open_cached_content_model(state: Any, directory: str) -> RecommendationModel:
    """Load a trusted artifact, reusing a cache when the manifest is unchanged.

    Callers decide whether a failure is an HTTP error. This does not run at import.
    """

    from app.ml.errors import ArtifactError

    cleaned = directory.strip()
    if not cleaned:
        raise ArtifactError("Model artifact directory was not found")
    path = Path(cleaned)
    stamp = (path / "manifest.json").stat().st_mtime_ns
    identity = str(path.resolve())
    cached = getattr(state, "content_recommendation_model", None)
    if _content_cache_hit(cached, stamp, identity):
        return cached[2]
    with _CONTENT_LOAD_LOCK:
        cached = getattr(state, "content_recommendation_model", None)
        if _content_cache_hit(cached, stamp, identity):
            return cached[2]
        model = RecommendationModel.load(path, trusted=True)
        state.content_recommendation_model = (stamp, identity, model)
        return model


def _content_cache_hit(cached: object, stamp: int, identity: str) -> bool:
    return (
        isinstance(cached, tuple)
        and len(cached) == 3
        and cached[0] == stamp
        and cached[1] == identity
        and isinstance(cached[2], RecommendationModel)
    )

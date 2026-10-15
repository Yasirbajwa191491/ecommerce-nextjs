"""Load trusted behavioral artifacts and rank one product.

Loaders cache a verified model on the FastAPI app state. Training does not run
here. A missing collaborative artifact is an error for the collaborative
strategy. Hybrid may fall back to a component model and names that fallback.
"""

import threading
from pathlib import Path
from typing import Any

from app.ml.errors import ArtifactError, ModelUnavailableError
from app.ml.inference.recommendations import open_cached_content_model
from app.ml.models.behavioral_artifacts import load_collaborative, load_hybrid_config
from app.ml.models.collaborative_recommender import CollaborativeRecommender
from app.ml.models.hybrid_recommender import HybridConfig, HybridRecommender

_LOCK = threading.Lock()


def open_cached_collaborative_model(state: Any, directory: str) -> CollaborativeRecommender:
    cleaned = directory.strip()
    if not cleaned:
        raise ArtifactError("Collaborative model artifact directory was not found")
    path = Path(cleaned)
    stamp = (path / "manifest.json").stat().st_mtime_ns
    identity = str(path.resolve())
    cached = getattr(state, "collaborative_recommendation_model", None)
    if _cache_hit(cached, stamp, identity):
        return cached[2]
    with _LOCK:
        cached = getattr(state, "collaborative_recommendation_model", None)
        if _cache_hit(cached, stamp, identity):
            return cached[2]
        model, _manifest = load_collaborative(path, trusted=True)
        state.collaborative_recommendation_model = (stamp, identity, model)
        return model


def open_cached_hybrid_config(state: Any, directory: str) -> HybridConfig | None:
    cleaned = directory.strip()
    if not cleaned:
        return None
    path = Path(cleaned)
    config_path = path / "hybrid.json"
    if not config_path.is_file():
        raise ArtifactError("Hybrid configuration was not found")
    stamp = config_path.stat().st_mtime_ns
    identity = str(path.resolve())
    cached = getattr(state, "hybrid_recommendation_config", None)
    if _cache_hit(cached, stamp, identity):
        return cached[2]
    with _LOCK:
        cached = getattr(state, "hybrid_recommendation_config", None)
        if _cache_hit(cached, stamp, identity):
            return cached[2]
        config = load_hybrid_config(path)
        state.hybrid_recommendation_config = (stamp, identity, config)
        return config


def recommend_from_disk(
    *,
    product_id: str,
    top_k: int,
    strategy: str,
    content_dir: Path | None,
    collaborative_dir: Path | None,
    hybrid_dir: Path | None,
) -> dict[str, object]:
    state = type("State", (), {})()
    content = None
    collaborative = None
    config = None
    if content_dir is not None:
        content = open_cached_content_model(state, str(content_dir))
    if collaborative_dir is not None:
        collaborative = open_cached_collaborative_model(state, str(collaborative_dir))
    if hybrid_dir is not None:
        config = open_cached_hybrid_config(state, str(hybrid_dir))
    if strategy == "collaborative" and collaborative is None:
        raise ModelUnavailableError("Collaborative model is unavailable")
    if strategy == "content" and content is None:
        raise ModelUnavailableError("Content model is unavailable")
    if strategy == "hybrid" and content is None and collaborative is None:
        raise ModelUnavailableError("Hybrid models are unavailable")
    recommender = HybridRecommender(content=content, collaborative=collaborative, config=config)
    result = recommender.recommend(product_id, top_k, strategy=strategy)
    return result.to_dict()


def _cache_hit(cached: object, stamp: int, identity: str) -> bool:
    return (
        isinstance(cached, tuple)
        and len(cached) == 3
        and cached[0] == stamp
        and cached[1] == identity
    )

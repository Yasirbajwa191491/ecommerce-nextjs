"""Load a trusted neural artifact once and rank one product.

The API imports this module only when a request asks for the neural strategy.
Startup does not train, and a request does not reload the weights when the
artifact timestamp is unchanged.
"""

import threading
from pathlib import Path
from typing import Any

from app.ml.errors import ArtifactError, ModelUnavailableError, UnknownProductError
from app.ml.models.neural_artifacts import load_neural
from app.ml.models.neural_recommender import NeuralRecommender

_LOCK = threading.Lock()


def open_cached_neural_model(state: Any, directory: str) -> NeuralRecommender:
    cleaned = directory.strip()
    if not cleaned:
        raise ArtifactError("Neural model artifact directory was not found")
    path = Path(cleaned)
    manifest = path / "manifest.json"
    if not manifest.is_file():
        raise ArtifactError("Neural model artifact directory was not found")
    stamp = manifest.stat().st_mtime_ns
    identity = str(path.resolve())
    cached = getattr(state, "neural_recommendation_model", None)
    if _cache_hit(cached, stamp, identity):
        return cached[2]
    with _LOCK:
        cached = getattr(state, "neural_recommendation_model", None)
        if _cache_hit(cached, stamp, identity):
            return cached[2]
        model, _manifest = load_neural(path, trusted=True)
        state.neural_recommendation_model = (stamp, identity, model)
        return model


def recommend_neural_from_disk(
    *,
    product_id: str,
    top_k: int,
    neural_dir: Path,
) -> dict[str, object]:
    if not (neural_dir / "manifest.json").is_file():
        raise ModelUnavailableError("Neural model is unavailable")
    state = type("State", (), {})()
    model = open_cached_neural_model(state, str(neural_dir))
    try:
        result = model.recommend(product_id, top_k)
    except UnknownProductError:
        raise
    return result.to_dict()


def _cache_hit(cached: object, stamp: int, identity: str) -> bool:
    return (
        isinstance(cached, tuple)
        and len(cached) == 3
        and cached[0] == stamp
        and cached[1] == identity
    )

"""Versioned artifacts for collaborative and hybrid models.

Joblib can execute code while loading. Load only artifacts this project wrote,
and only after the manifest checksum and version checks succeed. These writers
refuse the Phase 2 `content-v1` directory.
"""

import hashlib
import json
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import sklearn

from app.ml.behavioral.constants import (
    BEHAVIORAL_ARTIFACT_FORMAT_VERSION,
    COLLABORATIVE_MODEL_NAME,
    COLLABORATIVE_MODEL_VERSION,
    HYBRID_MODEL_NAME,
    HYBRID_MODEL_VERSION,
)
from app.ml.errors import ArtifactError, IncompatibleArtifactError
from app.ml.models.artifacts import atomic_directory, library_versions, sha256_file
from app.ml.models.collaborative_recommender import (
    CollaborativeRecommender,
    CollaborativeTrainingSummary,
)
from app.ml.models.hybrid_recommender import HybridConfig

MODEL_FILENAME = "model.joblib"
MANIFEST_FILENAME = "manifest.json"
HYBRID_FILENAME = "hybrid.json"


def save_collaborative_artifacts(
    destination: Path,
    recommender: CollaborativeRecommender,
    summary: CollaborativeTrainingSummary,
    *,
    trained_at: str | None = None,
    dataset_source: str,
    weighting: dict[str, object],
    dependency_versions: dict[str, str] | None = None,
) -> dict[str, Any]:
    if not recommender.is_fitted or recommender.summary is None:
        raise ArtifactError("Cannot save a collaborative model that is not fitted")
    if destination.name == "content-v1" or destination.name.startswith("content-v1"):
        raise ArtifactError("Refusing to overwrite a content-v1 artifact directory")
    if dataset_source not in {"synthetic", "convex_export"}:
        raise ArtifactError("Dataset source must be synthetic or convex_export")
    versions = dict(dependency_versions or _versions())
    timestamp = trained_at or datetime.now(UTC).isoformat()
    with atomic_directory(destination) as staging:
        payload_path = staging / MODEL_FILENAME
        joblib.dump(_payload(recommender, summary), payload_path, compress=0, protocol=5)
        manifest = {
            "format_version": BEHAVIORAL_ARTIFACT_FORMAT_VERSION,
            "model_name": COLLABORATIVE_MODEL_NAME,
            "model_version": COLLABORATIVE_MODEL_VERSION,
            "artifact_version": COLLABORATIVE_MODEL_VERSION
            if dataset_source == "synthetic"
            else f"{COLLABORATIVE_MODEL_VERSION}-{summary.dataset_fingerprint[:12]}",
            "dataset_source": dataset_source,
            "dataset_fingerprint": summary.dataset_fingerprint,
            "feature_version": summary.feature_version,
            "trained_at": timestamp,
            "product_count": summary.product_count,
            "visitor_count": summary.visitor_count,
            "interaction_count": summary.interaction_count,
            "matrix_sparsity": summary.matrix_sparsity,
            "training_seconds": summary.training_seconds,
            "weighting": weighting,
            "library_versions": versions,
            "sklearn_version": versions["scikit-learn"],
            "files": {MODEL_FILENAME: {"sha256": sha256_file(payload_path)}},
            "serialization": "joblib",
            "trusted_source_required": True,
            "warning": (
                "Do not load this joblib file from an untrusted source. "
                "Unpickling can execute code."
            ),
        }
        (staging / MANIFEST_FILENAME).write_text(
            json.dumps(manifest, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
            newline="\n",
        )
    return manifest


def load_collaborative(
    destination: Path, *, trusted: bool
) -> tuple[CollaborativeRecommender, dict[str, Any]]:
    if not trusted:
        raise ArtifactError(
            "Refusing to load a serialized model. Pass trusted=True only for artifacts "
            "created by this project."
        )
    manifest = _read_manifest(destination)
    if manifest.get("model_name") != COLLABORATIVE_MODEL_NAME:
        raise IncompatibleArtifactError("Incompatible collaborative model")
    if manifest.get("model_version") != COLLABORATIVE_MODEL_VERSION:
        raise IncompatibleArtifactError(
            f"Incompatible model version: {manifest.get('model_version')}"
        )
    if manifest.get("format_version") != BEHAVIORAL_ARTIFACT_FORMAT_VERSION:
        raise IncompatibleArtifactError("Unsupported artifact format")
    sklearn_version = manifest.get("sklearn_version")
    if not isinstance(sklearn_version, str) or _major_minor(sklearn_version) != _major_minor(
        sklearn.__version__
    ):
        raise IncompatibleArtifactError("Incompatible scikit-learn version for this artifact")
    model_path = destination / MODEL_FILENAME
    expected = manifest.get("files", {}).get(MODEL_FILENAME, {}).get("sha256")
    actual = sha256_file(model_path)
    if not isinstance(expected, str) or not hmac_equal(expected, actual):
        raise ArtifactError("Artifact checksum does not match the manifest")
    try:
        payload = joblib.load(model_path)
    except Exception as exc:
        raise ArtifactError("Artifact payload could not be read") from exc
    return _recommender_from_payload(payload, manifest), manifest


def save_hybrid_config(
    destination: Path, config: HybridConfig, *, configured_at: str | None = None
) -> dict[str, Any]:
    if destination.name == "content-v1" or destination.name.startswith("content-v1"):
        raise ArtifactError("Refusing to overwrite a content-v1 artifact directory")
    destination = destination.resolve()
    if destination.exists() and not destination.is_dir():
        raise ArtifactError("Hybrid output path is not a directory")
    staging = destination.parent / f".{destination.name}.staging-{uuid.uuid4().hex}"
    staging.mkdir(parents=True)
    payload = config.to_dict()
    payload["configured_at"] = configured_at or datetime.now(UTC).isoformat()
    payload["format_version"] = BEHAVIORAL_ARTIFACT_FORMAT_VERSION
    try:
        (staging / HYBRID_FILENAME).write_text(
            json.dumps(payload, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
            newline="\n",
        )
        if destination.exists():
            backup = destination.parent / f".{destination.name}.backup-{uuid.uuid4().hex}"
            destination.replace(backup)
            staging.replace(destination)
            if backup.exists():
                import shutil

                shutil.rmtree(backup, ignore_errors=True)
        else:
            staging.replace(destination)
    except Exception:
        import shutil

        shutil.rmtree(staging, ignore_errors=True)
        raise
    return payload


def load_hybrid_config(destination: Path) -> HybridConfig:
    path = destination / HYBRID_FILENAME
    if not path.is_file():
        raise ArtifactError("Hybrid configuration was not found")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ArtifactError("Hybrid configuration could not be read") from exc
    if not isinstance(payload, dict):
        raise ArtifactError("Hybrid configuration could not be read")
    if payload.get("model_version") != HYBRID_MODEL_VERSION:
        raise IncompatibleArtifactError("Incompatible hybrid model version")
    if payload.get("model_name") != HYBRID_MODEL_NAME:
        raise IncompatibleArtifactError("Incompatible hybrid model")
    try:
        return HybridConfig(
            content_weight=float(payload["content_weight"]),
            collaborative_weight=float(payload["collaborative_weight"]),
            fusion=str(payload["fusion"]),
            rrf_k=int(payload["rrf_k"]),
            content_model_version=str(payload.get("content_model_version") or "content-v1"),
            collaborative_model_version=str(
                payload.get("collaborative_model_version") or "collaborative-v1"
            ),
            dataset_fingerprint=str(payload.get("dataset_fingerprint") or ""),
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise ArtifactError("Hybrid configuration could not be read") from exc


def _payload(
    recommender: CollaborativeRecommender,
    summary: CollaborativeTrainingSummary,
) -> dict[str, object]:
    return {
        "product_ids": list(recommender.product_ids),
        "neighbors": {
            product_id: [[neighbor_id, score] for neighbor_id, score in pairs]
            for product_id, pairs in recommender.neighbors.items()
        },
        "dataset_fingerprint": recommender.dataset_fingerprint,
        "summary": summary.to_dict(),
    }


def _recommender_from_payload(
    payload: object,
    manifest: dict[str, Any],
) -> CollaborativeRecommender:
    if not isinstance(payload, dict):
        raise ArtifactError("Artifact payload could not be read")
    product_ids = payload.get("product_ids")
    raw_neighbors = payload.get("neighbors")
    fingerprint = payload.get("dataset_fingerprint")
    raw_summary = payload.get("summary")
    if (
        not isinstance(product_ids, list)
        or not isinstance(raw_neighbors, dict)
        or not isinstance(fingerprint, str)
        or not isinstance(raw_summary, dict)
    ):
        raise ArtifactError("Artifact payload could not be read")
    neighbors: dict[str, list[tuple[str, float]]] = {}
    for product_id, pairs in raw_neighbors.items():
        if not isinstance(product_id, str) or not isinstance(pairs, list):
            raise ArtifactError("Artifact payload could not be read")
        parsed: list[tuple[str, float]] = []
        for pair in pairs:
            if (
                not isinstance(pair, list)
                or len(pair) != 2
                or not isinstance(pair[0], str)
                or isinstance(pair[1], bool)
                or not isinstance(pair[1], (int, float))
            ):
                raise ArtifactError("Artifact payload could not be read")
            parsed.append((pair[0], float(pair[1])))
        neighbors[product_id] = parsed
    summary = CollaborativeTrainingSummary(
        model_name=COLLABORATIVE_MODEL_NAME,
        model_version=COLLABORATIVE_MODEL_VERSION,
        feature_version=str(raw_summary.get("feature_version") or ""),
        dataset_fingerprint=str(raw_summary.get("dataset_fingerprint") or fingerprint),
        product_count=int(raw_summary.get("product_count") or len(product_ids)),
        visitor_count=int(raw_summary.get("visitor_count") or 0),
        interaction_count=int(raw_summary.get("interaction_count") or 0),
        matrix_sparsity=float(raw_summary.get("matrix_sparsity") or 0),
        training_seconds=float(raw_summary.get("training_seconds") or 0),
        min_product_interactions=int(raw_summary.get("min_product_interactions") or 1),
        min_visitor_interactions=int(raw_summary.get("min_visitor_interactions") or 1),
        max_neighbors=int(raw_summary.get("max_neighbors") or 50),
    )
    if manifest.get("dataset_fingerprint") != fingerprint:
        raise ArtifactError("Artifact payload does not match the manifest")
    model = CollaborativeRecommender()
    model.restore(
        product_ids=[str(item) for item in product_ids],
        neighbors=neighbors,
        dataset_fingerprint=fingerprint,
        summary=summary,
    )
    return model


def _read_manifest(destination: Path) -> dict[str, Any]:
    if not destination.is_dir():
        raise ArtifactError("Model artifact directory was not found")
    path = destination / MANIFEST_FILENAME
    if not path.is_file() or not (destination / MODEL_FILENAME).is_file():
        raise ArtifactError("Model artifact is missing required files")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ArtifactError("Artifact manifest could not be read") from exc
    if not isinstance(payload, dict):
        raise ArtifactError("Artifact manifest could not be read")
    return payload


def _versions() -> dict[str, str]:
    import scipy

    versions = library_versions()
    versions["scipy"] = scipy.__version__
    return versions


def _major_minor(version: str) -> str:
    parts = version.split(".")
    return ".".join(parts[:2])


def hmac_equal(left: str, right: str) -> bool:
    return (
        hashlib.sha256(left.encode("utf-8")).digest()
        == hashlib.sha256(right.encode("utf-8")).digest()
        and left == right
    )

"""Versioned artifact storage for the content recommender.

joblib serializes Python objects. Loading an untrusted joblib or pickle file
can execute code. Only load artifacts this project wrote, and only after the
manifest, checksum, and version checks succeed.

Publication writes a staging directory and swaps it into place. A failed write
leaves the previous directory unchanged.
"""

import hashlib
import json
import shutil
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import sklearn

from app.ml.constants import ARTIFACT_FORMAT_VERSION, MODEL_NAME, MODEL_VERSION
from app.ml.errors import ArtifactError, IncompatibleArtifactError
from app.ml.models.content_recommender import ContentRecommender, TrainingSummary

MODEL_FILENAME = "model.joblib"
MANIFEST_FILENAME = "manifest.json"


def library_versions() -> dict[str, str]:
    import numpy as np
    import pandas as pd

    return {
        "python": _python_version(),
        "numpy": np.__version__,
        "pandas": pd.__version__,
        "scikit-learn": sklearn.__version__,
        "joblib": joblib.__version__,
    }


def save_artifacts(
    destination: Path,
    recommender: ContentRecommender,
    summary: TrainingSummary,
    *,
    trained_at: str | None = None,
    artifact_version: str | None = None,
    dataset_source: str = "synthetic",
) -> dict[str, Any]:
    if not recommender.is_fitted:
        raise ArtifactError("Cannot save a model that is not fitted")
    if dataset_source not in {"synthetic", "real_catalog"}:
        raise ArtifactError("Dataset source must be synthetic or real_catalog")
    timestamp = trained_at or datetime.now(UTC).isoformat()
    with atomic_directory(destination) as staging:
        payload_path = staging / MODEL_FILENAME
        joblib.dump(_payload(recommender), payload_path, compress=0, protocol=5)
        manifest = _manifest(
            summary,
            trained_at=timestamp,
            file_hash=sha256_file(payload_path),
            feature_config_payload=recommender.feature_config,
            artifact_version=artifact_version or summary.model_version,
            dataset_source=dataset_source,
        )
        (staging / MANIFEST_FILENAME).write_text(
            json.dumps(manifest, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
            newline="\n",
        )
    return manifest


def load_recommender(
    destination: Path, *, trusted: bool
) -> tuple[ContentRecommender, dict[str, Any]]:
    if not trusted:
        raise ArtifactError(
            "Refusing to load a serialized model. joblib files can execute code when "
            "unpickled. Pass trusted=True only for artifacts created by this project."
        )
    if not destination.is_dir():
        raise ArtifactError("Model artifact directory was not found")
    manifest_path = destination / MANIFEST_FILENAME
    model_path = destination / MODEL_FILENAME
    if not manifest_path.is_file() or not model_path.is_file():
        raise ArtifactError("Model artifact is missing required files")
    manifest = _read_manifest(manifest_path)
    _validate_manifest(manifest)
    expected_hash = manifest.get("files", {}).get(MODEL_FILENAME, {}).get("sha256")
    actual_hash = sha256_file(model_path)
    if not isinstance(expected_hash, str) or not _hashes_match(expected_hash, actual_hash):
        raise ArtifactError("Artifact checksum does not match the manifest")
    try:
        payload = joblib.load(model_path)
    except Exception as exc:
        raise ArtifactError("Artifact payload could not be read") from exc
    recommender = _recommender_from_payload(payload, manifest)
    return recommender, manifest


@contextmanager
def atomic_directory(destination: Path) -> Iterator[Path]:
    """Yield a staging directory and publish it only if the block succeeds."""

    destination = destination.resolve()
    if destination.exists() and not destination.is_dir():
        raise ArtifactError("Artifact output path is not a directory")
    destination.parent.mkdir(parents=True, exist_ok=True)
    staging = destination.parent / f".{destination.name}.staging-{uuid.uuid4().hex}"
    staging.mkdir()
    try:
        yield staging
    except Exception:
        shutil.rmtree(staging, ignore_errors=True)
        raise

    backup: Path | None = None
    try:
        if destination.exists():
            backup = destination.parent / f".{destination.name}.backup-{uuid.uuid4().hex}"
            destination.replace(backup)
        staging.replace(destination)
    except Exception:
        if backup is not None and backup.exists() and not destination.exists():
            backup.replace(destination)
        if staging.exists():
            shutil.rmtree(staging, ignore_errors=True)
        raise
    if backup is not None and backup.exists():
        shutil.rmtree(backup, ignore_errors=True)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _payload(recommender: ContentRecommender) -> dict[str, object]:
    return {
        "pipeline": recommender.pipeline,
        "matrix": recommender.matrix,
        "product_ids": list(recommender.product_ids),
        "eligible": [bool(value) for value in recommender.eligible],
        "feature_config": recommender.feature_config,
        "dataset_fingerprint": recommender.dataset_fingerprint,
        "model_name": recommender.model_name,
        "model_version": recommender.model_version,
    }


def _manifest(
    summary: TrainingSummary,
    *,
    trained_at: str,
    file_hash: str,
    feature_config_payload: dict[str, object],
    artifact_version: str,
    dataset_source: str,
) -> dict[str, Any]:
    versions = library_versions()
    return {
        "format_version": ARTIFACT_FORMAT_VERSION,
        "model_name": summary.model_name,
        "model_version": summary.model_version,
        "artifact_version": artifact_version,
        "dataset_source": dataset_source,
        "trained_at": trained_at,
        "dataset_fingerprint": summary.dataset_fingerprint,
        "rows_fitted": summary.rows_fitted,
        "eligible_products": summary.eligible_products,
        "feature_dimensions": summary.feature_dimensions,
        "vocabulary_size": summary.vocabulary_size,
        "feature_config": feature_config_payload,
        "library_versions": versions,
        "sklearn_version": versions["scikit-learn"],
        "files": {MODEL_FILENAME: {"sha256": file_hash, "role": "fitted_pipeline_and_index"}},
        "serialization": "joblib",
        "trusted_source_required": True,
        "warning": (
            "Do not load this joblib file from an untrusted source. Unpickling can execute code."
        ),
    }


def _read_manifest(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ArtifactError("Artifact manifest could not be read") from exc
    if not isinstance(payload, dict):
        raise ArtifactError("Artifact manifest could not be read")
    return payload


def _validate_manifest(manifest: dict[str, Any]) -> None:
    required = (
        "format_version",
        "model_name",
        "model_version",
        "trained_at",
        "dataset_fingerprint",
        "sklearn_version",
        "files",
        "feature_config",
    )
    if any(key not in manifest for key in required):
        raise ArtifactError("Artifact manifest is incomplete")
    if manifest["format_version"] != ARTIFACT_FORMAT_VERSION:
        raise IncompatibleArtifactError("Unsupported artifact format")
    if manifest["model_name"] != MODEL_NAME or manifest["model_version"] != MODEL_VERSION:
        raise IncompatibleArtifactError(
            f"Incompatible model version: {manifest.get('model_version')}"
        )
    if not isinstance(manifest["sklearn_version"], str):
        raise ArtifactError("Artifact manifest is incomplete")
    if _major_minor(manifest["sklearn_version"]) != _major_minor(sklearn.__version__):
        raise IncompatibleArtifactError("Incompatible scikit-learn version for this artifact")
    if not isinstance(manifest["dataset_fingerprint"], str) or not manifest["dataset_fingerprint"]:
        raise ArtifactError("Artifact manifest is incomplete")


def _recommender_from_payload(
    payload: object,
    manifest: dict[str, Any],
) -> ContentRecommender:
    if not isinstance(payload, dict):
        raise ArtifactError("Artifact payload could not be read")
    pipeline = payload.get("pipeline")
    matrix = payload.get("matrix")
    product_ids = payload.get("product_ids")
    eligible = payload.get("eligible")
    feature_config_payload = payload.get("feature_config")
    fingerprint = payload.get("dataset_fingerprint")
    if not hasattr(pipeline, "transform"):
        raise ArtifactError("Artifact payload could not be read")
    if not isinstance(product_ids, list) or not all(isinstance(item, str) for item in product_ids):
        raise ArtifactError("Artifact payload could not be read")
    if not isinstance(eligible, list) or len(eligible) != len(product_ids):
        raise ArtifactError("Artifact payload could not be read")
    if not isinstance(feature_config_payload, dict) or not isinstance(fingerprint, str):
        raise ArtifactError("Artifact payload could not be read")
    if fingerprint != manifest["dataset_fingerprint"]:
        raise ArtifactError("Artifact fingerprint does not match the manifest")
    if payload.get("model_version") != MODEL_VERSION:
        raise IncompatibleArtifactError("Incompatible model version")
    cleaned_eligible: list[bool] = []
    for value in eligible:
        if isinstance(value, bool):
            cleaned_eligible.append(value)
            continue
        if type(value).__name__ == "bool_":
            cleaned_eligible.append(bool(value))
            continue
        raise ArtifactError("Artifact payload could not be read")
    recommender = ContentRecommender()
    try:
        recommender.restore(
            pipeline=pipeline,
            matrix=matrix,
            product_ids=product_ids,
            eligible=cleaned_eligible,
            feature_config_payload=feature_config_payload,
            dataset_fingerprint_value=fingerprint,
        )
    except Exception as exc:
        raise ArtifactError("Artifact payload could not be read") from exc
    return recommender


def _python_version() -> str:
    import sys

    info = sys.version_info
    return f"{info.major}.{info.minor}.{info.micro}"


def _major_minor(version: str) -> str:
    parts = version.split(".")
    if len(parts) < 2:
        return version
    return f"{parts[0]}.{parts[1]}"


def _hashes_match(expected: str, actual: str) -> bool:
    if len(expected) != len(actual):
        return False
    import secrets

    return secrets.compare_digest(expected, actual)

"""Trusted artifact IO. User-supplied paths and pickle files are rejected."""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path
from typing import Any

import joblib

from app.ml.forecasting import MODEL_VERSION
from app.ml.forecasting.features import FEATURE_COLUMNS

ARTIFACT_DIR_NAME = MODEL_VERSION


class ArtifactError(ValueError):
    pass


def artifact_dir(root: str | Path) -> Path:
    path = Path(root) / "forecasting" / ARTIFACT_DIR_NAME
    if ".." in path.parts:
        raise ArtifactError("Artifact path is not allowed")
    return path


def save_artifact(root: str | Path, regressor: Any, metadata: dict[str, Any]) -> Path:
    target = artifact_dir(root)
    temporary = target.parent / f"{ARTIFACT_DIR_NAME}.tmp"
    if temporary.exists():
        shutil.rmtree(temporary)
    temporary.mkdir(parents=True)
    model_path = temporary / "regressor.joblib"
    joblib.dump(
        {"model": regressor, "features": FEATURE_COLUMNS, "version": MODEL_VERSION}, model_path
    )
    metadata = {
        **metadata,
        "model_version": MODEL_VERSION,
        "checksum_sha256": hashlib.sha256(model_path.read_bytes()).hexdigest(),
        "feature_schema": "forecast-features-v1",
    }
    (temporary / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    if target.exists():
        shutil.rmtree(target)
    temporary.rename(target)
    return target


def load_artifact(root: str | Path) -> tuple[Any, dict[str, Any]]:
    target = artifact_dir(root)
    model_path = target / "regressor.joblib"
    meta_path = target / "metadata.json"
    if not model_path.is_file() or not meta_path.is_file():
        raise ArtifactError("Forecast artifact is not available")
    metadata = json.loads(meta_path.read_text(encoding="utf-8"))
    if metadata.get("model_version") != MODEL_VERSION:
        raise ArtifactError("Forecast artifact version does not match")
    digest = hashlib.sha256(model_path.read_bytes()).hexdigest()
    if digest != metadata.get("checksum_sha256"):
        raise ArtifactError("Forecast artifact checksum does not match")
    payload = joblib.load(model_path)
    if not isinstance(payload, dict) or payload.get("version") != MODEL_VERSION:
        raise ArtifactError("Forecast artifact payload is not trusted")
    if payload.get("features") != FEATURE_COLUMNS:
        raise ArtifactError("Forecast feature schema does not match")
    return payload["model"], metadata

"""Versioned PyTorch artifacts for the neural recommendation model.

Weights are a `state_dict` loaded with `weights_only=True`. The writer refuses
the content, collaborative, and hybrid directories. Load only files this
project wrote, and only after the manifest checksum and version checks.
"""

import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import torch

from app.ml.errors import ArtifactError, IncompatibleArtifactError
from app.ml.models.artifacts import atomic_directory, sha256_file
from app.ml.models.neural_recommender import NeuralRecommender
from app.ml.neural.constants import (
    NEURAL_ARTIFACT_FORMAT_VERSION,
    NEURAL_FEATURE_VERSION,
    NEURAL_MODEL_NAME,
    NEURAL_MODEL_VERSION,
    NEURAL_OBJECTIVE,
    NEURAL_SCORE_KIND,
    PROTECTED_ARTIFACT_PREFIXES,
)
from app.ml.neural.module import NeuralMatrixFactorization

WEIGHTS_FILENAME = "weights.pt"
MAPPINGS_FILENAME = "mappings.json"
CONFIG_FILENAME = "config.json"
MANIFEST_FILENAME = "manifest.json"
REPORT_FILENAME = "training-report.json"
EVALUATION_FILENAME = "evaluation.json"


def save_neural_artifacts(
    destination: Path,
    recommender: NeuralRecommender,
    *,
    dataset_source: str,
    report: dict[str, object],
    trained_at: str | None = None,
) -> dict[str, Any]:
    if not recommender.is_fitted or recommender.module is None:
        raise ArtifactError("Cannot save a neural model that is not fitted")
    _refuse_protected(destination)
    if dataset_source not in {"synthetic", "convex_export"}:
        raise ArtifactError("Dataset source must be synthetic or convex_export")
    if dataset_source == "convex_export" and destination.exists():
        raise ArtifactError("Refusing to overwrite an existing convex_export artifact")
    timestamp = trained_at or datetime.now(UTC).isoformat()
    architecture = _architecture(recommender)
    mappings = {
        "visitor_ids": list(recommender.visitor_ids),
        "product_ids": list(recommender.product_ids),
        "catalog_ids": list(recommender.catalog_ids),
    }
    fingerprint = recommender.dataset_fingerprint
    artifact_version = (
        NEURAL_MODEL_VERSION
        if dataset_source == "synthetic"
        else f"{NEURAL_MODEL_VERSION}-{fingerprint[:12]}"
    )
    with atomic_directory(destination) as staging:
        weights_path = staging / WEIGHTS_FILENAME
        torch.save(recommender.module.state_dict(), weights_path)
        _write_json(staging / MAPPINGS_FILENAME, mappings)
        _write_json(staging / CONFIG_FILENAME, architecture)
        _write_json(staging / REPORT_FILENAME, report)
        manifest = {
            "format_version": NEURAL_ARTIFACT_FORMAT_VERSION,
            "model_name": NEURAL_MODEL_NAME,
            "model_version": NEURAL_MODEL_VERSION,
            "artifact_version": artifact_version,
            "feature_version": NEURAL_FEATURE_VERSION,
            "dataset_source": dataset_source,
            "dataset_fingerprint": fingerprint,
            "trained_at": timestamp,
            "python_version": _python_version(),
            "pytorch_version": torch.__version__,
            "objective": NEURAL_OBJECTIVE,
            "score_kind": NEURAL_SCORE_KIND,
            "serialization": "torch_state_dict",
            "weights_only": True,
            "trusted_source_required": True,
            "product_count": len(recommender.catalog_ids),
            "embedded_product_count": len(recommender.product_ids),
            "visitor_count": len(recommender.visitor_ids),
            "best_validation_loss": recommender.validation_loss,
            "training_seconds": report.get("training_seconds"),
            "seed": report.get("seed"),
            "device": report.get("device"),
            "files": {
                WEIGHTS_FILENAME: {"sha256": sha256_file(weights_path)},
                MAPPINGS_FILENAME: {"sha256": sha256_file(staging / MAPPINGS_FILENAME)},
                CONFIG_FILENAME: {"sha256": sha256_file(staging / CONFIG_FILENAME)},
            },
            "nondeterminism": (
                "CPU training with a fixed seed is reproducible on the same "
                "Python and PyTorch build. It is not bit-for-bit across hardware, "
                "operating systems, or PyTorch versions."
            ),
            "limitation": (
                "Item-to-item scores are cosine similarity of learned product "
                "embeddings. They are not predicted purchase probabilities. "
                "Unobserved pairs used as negatives are not confirmed dislikes."
            ),
        }
        _write_json(staging / MANIFEST_FILENAME, manifest)
    return manifest


def load_neural(destination: Path, *, trusted: bool) -> tuple[NeuralRecommender, dict[str, Any]]:
    if not trusted:
        raise ArtifactError(
            "Refusing to load a neural artifact. Pass trusted=True only for files "
            "created by this project."
        )
    manifest = _read_json_object(destination / MANIFEST_FILENAME, "Artifact manifest")
    _validate_manifest(manifest)
    _check_file(destination, manifest, WEIGHTS_FILENAME)
    _check_file(destination, manifest, MAPPINGS_FILENAME)
    _check_file(destination, manifest, CONFIG_FILENAME)
    architecture = _read_json_object(destination / CONFIG_FILENAME, "Model configuration")
    mappings = _read_json_object(destination / MAPPINGS_FILENAME, "Model mappings")
    try:
        state = torch.load(destination / WEIGHTS_FILENAME, map_location="cpu", weights_only=True)
    except Exception as exc:
        raise ArtifactError("Neural weights could not be read") from exc
    module = _module_from_parts(architecture, mappings, state)
    visitor_ids = _string_list(mappings.get("visitor_ids"), "visitor mapping")
    product_ids = _string_list(mappings.get("product_ids"), "product mapping")
    catalog_ids = _string_list(mappings.get("catalog_ids"), "catalog mapping")
    fingerprint = manifest.get("dataset_fingerprint")
    if not isinstance(fingerprint, str) or not fingerprint:
        raise ArtifactError("Artifact manifest is incomplete")
    validation_loss = manifest.get("best_validation_loss")
    parsed_loss = None
    if not isinstance(validation_loss, bool) and isinstance(validation_loss, (int, float)):
        parsed_loss = float(validation_loss)
    recommender = NeuralRecommender()
    recommender.bind(
        module,
        visitor_ids=visitor_ids,
        product_ids=product_ids,
        catalog_ids=catalog_ids,
        dataset_fingerprint=fingerprint,
        trained_at=str(manifest.get("trained_at") or ""),
        validation_loss=parsed_loss,
        metadata={"model_version": NEURAL_MODEL_VERSION},
        evaluation_summary=_optional_evaluation(destination),
    )
    return recommender, manifest


def attach_neural_evaluation(destination: Path, summary: dict[str, object]) -> None:
    manifest_path = destination / MANIFEST_FILENAME
    if not manifest_path.is_file():
        raise ArtifactError("Neural artifact directory was not found")
    manifest = _read_json_object(manifest_path, "Artifact manifest")
    if manifest.get("model_version") != NEURAL_MODEL_VERSION:
        raise IncompatibleArtifactError("Incompatible neural model version")
    _write_json(destination / EVALUATION_FILENAME, summary)


def _module_from_parts(
    architecture: dict[str, Any],
    mappings: dict[str, Any],
    state: object,
) -> NeuralMatrixFactorization:
    if not isinstance(state, dict):
        raise ArtifactError("Neural weights could not be read")
    try:
        embedding_dim = int(architecture["embedding_dim"])
        hidden_sizes = tuple(int(size) for size in architecture["hidden_sizes"])
        dropout = float(architecture["dropout"])
        n_visitors = int(architecture["n_visitors"])
        n_products = int(architecture["n_products"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ArtifactError("Model configuration could not be read") from exc
    visitor_ids = mappings.get("visitor_ids")
    product_ids = mappings.get("product_ids")
    if (
        not isinstance(visitor_ids, list)
        or not isinstance(product_ids, list)
        or len(visitor_ids) != n_visitors
        or len(product_ids) != n_products
    ):
        raise ArtifactError("Model mappings do not match the architecture")
    module = NeuralMatrixFactorization(
        n_visitors,
        n_products,
        embedding_dim,
        hidden_sizes,
        dropout,
    )
    try:
        module.load_state_dict(state)
    except (RuntimeError, ValueError, TypeError) as exc:
        raise ArtifactError("Neural weights could not be read") from exc
    module.eval()
    return module


def _architecture(recommender: NeuralRecommender) -> dict[str, object]:
    module = recommender.module
    if module is None:
        raise ArtifactError("Cannot save a neural model that is not fitted")
    hidden: list[int] = []
    for layer in module.mlp:
        if isinstance(layer, torch.nn.Linear):
            hidden.append(int(layer.out_features))
    return {
        "embedding_dim": int(module.product_embedding.embedding_dim),
        "hidden_sizes": hidden,
        "dropout": _dropout(module),
        "n_visitors": int(module.visitor_embedding.num_embeddings),
        "n_products": int(module.product_embedding.num_embeddings),
    }


def _dropout(module: NeuralMatrixFactorization) -> float:
    for layer in module.mlp:
        if isinstance(layer, torch.nn.Dropout):
            return float(layer.p)
    return 0.0


def _validate_manifest(manifest: dict[str, Any]) -> None:
    if manifest.get("format_version") != NEURAL_ARTIFACT_FORMAT_VERSION:
        raise IncompatibleArtifactError("Unsupported artifact format")
    if manifest.get("model_name") != NEURAL_MODEL_NAME:
        raise IncompatibleArtifactError("Incompatible neural model")
    if manifest.get("model_version") != NEURAL_MODEL_VERSION:
        raise IncompatibleArtifactError(
            f"Incompatible model version: {manifest.get('model_version')}"
        )
    pytorch_version = manifest.get("pytorch_version")
    if not isinstance(pytorch_version, str) or _major_minor(pytorch_version) != _major_minor(
        torch.__version__
    ):
        raise IncompatibleArtifactError("Incompatible PyTorch version for this artifact")
    if manifest.get("objective") != NEURAL_OBJECTIVE:
        raise IncompatibleArtifactError("Incompatible neural scoring contract")
    if manifest.get("score_kind") != NEURAL_SCORE_KIND:
        raise IncompatibleArtifactError("Incompatible neural scoring contract")
    fingerprint = manifest.get("dataset_fingerprint")
    if not isinstance(fingerprint, str) or not fingerprint:
        raise ArtifactError("Artifact manifest is incomplete")
    if not isinstance(manifest.get("files"), dict):
        raise ArtifactError("Artifact manifest is incomplete")


def _check_file(destination: Path, manifest: dict[str, Any], name: str) -> None:
    path = destination / name
    if not path.is_file():
        raise ArtifactError("Model artifact is missing required files")
    expected = manifest.get("files", {}).get(name, {}).get("sha256")
    actual = sha256_file(path)
    if not isinstance(expected, str) or not _hashes_match(expected, actual):
        raise ArtifactError("Artifact checksum does not match the manifest")


def _optional_evaluation(destination: Path) -> dict[str, object] | None:
    path = destination / EVALUATION_FILENAME
    if not path.is_file():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict):
        return None
    warning = payload.get("warning")
    if not isinstance(warning, str) or not warning:
        return None
    return payload


def _refuse_protected(destination: Path) -> None:
    name = destination.name
    if name.startswith(PROTECTED_ARTIFACT_PREFIXES) or name in PROTECTED_ARTIFACT_PREFIXES:
        raise ArtifactError(f"Refusing to overwrite a {name} artifact directory")


def _read_json_object(path: Path, label: str) -> dict[str, Any]:
    if not path.is_file():
        raise ArtifactError(f"{label} could not be read")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ArtifactError(f"{label} could not be read") from exc
    if not isinstance(payload, dict):
        raise ArtifactError(f"{label} could not be read")
    return payload


def _write_json(path: Path, payload: dict[str, object]) -> None:
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def _string_list(value: object, label: str) -> list[str]:
    if not isinstance(value, list) or any(not isinstance(item, str) or not item for item in value):
        raise ArtifactError(f"Invalid {label}")
    return list(value)


def _python_version() -> str:
    info = sys.version_info
    return f"{info.major}.{info.minor}.{info.micro}"


def _major_minor(version: str) -> str:
    parts = version.split("+", 1)[0].split(".")
    if len(parts) < 2:
        return version
    return f"{parts[0]}.{parts[1]}"


def _hashes_match(expected: str, actual: str) -> bool:
    import secrets

    if len(expected) != len(actual):
        return False
    return secrets.compare_digest(expected, actual)

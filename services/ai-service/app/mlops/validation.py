"""Validate trusted artifacts without deserializing joblib, pickle, or torch files."""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from app.mlops.families import (
    SUPPORTED_FORMAT_VERSION,
    UNSAFE_SERIALIZATIONS,
    contract_for,
    version_matches,
)
from app.mlops.paths import UnsafePathError, resolve_trusted


@dataclass
class ValidationReport:
    family: str
    ok: bool
    model_version: str = ""
    artifact_version: str = ""
    feature_schema_version: str = ""
    dataset_fingerprint: str = ""
    checksum: str = ""
    trained_at: str = ""
    reasons: list[str] = field(default_factory=list)
    serialization: str = ""

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _read_json(path: Path) -> dict[str, Any] | None:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, UnicodeError):
        return None
    if not isinstance(payload, dict):
        return None
    return payload


def _major_minor(version: str) -> tuple[int, int] | None:
    parts = version.split(".")
    if len(parts) < 2:
        return None
    try:
        return int(parts[0]), int(parts[1])
    except ValueError:
        return None


def _installed_dependency(serialization: str) -> str | None:
    if serialization == "joblib":
        import sklearn

        return sklearn.__version__
    if serialization == "torch_state_dict":
        import torch

        return torch.__version__
    return None


def _checksum_from_manifest(manifest: dict[str, Any], payload_name: str) -> str:
    files = manifest.get("files")
    if isinstance(files, dict):
        entry = files.get(payload_name)
        if isinstance(entry, dict) and isinstance(entry.get("sha256"), str):
            return entry["sha256"]
    direct = manifest.get("checksum_sha256")
    if isinstance(direct, str):
        return direct
    return ""


def _reject_file_keys(manifest: dict[str, Any], directory: Path) -> list[str]:
    reasons: list[str] = []
    files = manifest.get("files")
    if not isinstance(files, dict):
        return reasons
    for name in files:
        if not isinstance(name, str):
            reasons.append("unsafe_path")
            continue
        try:
            resolve_trusted(directory, name)
        except UnsafePathError:
            reasons.append("unsafe_path")
    return reasons


def validate_directory(
    family: str,
    directory: Path,
    *,
    expected_checksum: str | None = None,
) -> ValidationReport:
    """Check manifest, checksum, schema, and dependency compatibility.

    Joblib and torch files are hashed only. They are not loaded.
    """

    try:
        contract = contract_for(family)
    except ValueError:
        return ValidationReport(family=family, ok=False, reasons=["unsupported_family"])

    report = ValidationReport(family=family, ok=False, serialization=contract.serialization)
    if not directory.is_dir():
        report.reasons.append("missing_artifact")
        return report

    try:
        manifest_path = resolve_trusted(directory, contract.manifest_name)
    except UnsafePathError:
        report.reasons.append("unsafe_path")
        return report

    manifest = _read_json(manifest_path)
    if manifest is None:
        report.reasons.append("corrupted_manifest")
        return report

    serialization = str(manifest.get("serialization") or contract.serialization)
    report.serialization = serialization
    if serialization.lower() in UNSAFE_SERIALIZATIONS:
        report.reasons.append("untrusted_serialization")
        return report
    if contract.family != "hybrid" and serialization != contract.serialization:
        report.reasons.append("untrusted_serialization")

    model_version = str(manifest.get("model_version") or "")
    report.model_version = model_version
    if not version_matches(family, model_version):
        report.reasons.append("unsupported_version")

    format_version = manifest.get("format_version", SUPPORTED_FORMAT_VERSION)
    if family != "demand_forecast" and format_version != SUPPORTED_FORMAT_VERSION:
        report.reasons.append("unsupported_version")

    report.reasons.extend(_reject_file_keys(manifest, directory))
    report.artifact_version = str(
        manifest.get("artifact_version") or manifest.get("model_version") or ""
    )
    report.dataset_fingerprint = str(manifest.get("dataset_fingerprint") or "")
    report.trained_at = str(manifest.get("trained_at") or manifest.get("configured_at") or "")
    report.feature_schema_version = _feature_schema(family, manifest, contract.feature_schema)
    if report.feature_schema_version != contract.feature_schema:
        report.reasons.append("incompatible_feature_schema")

    if contract.payload_name:
        try:
            payload_path = resolve_trusted(directory, contract.payload_name)
        except UnsafePathError:
            report.reasons.append("unsafe_path")
            payload_path = None
        if payload_path is None or not payload_path.is_file():
            report.reasons.append("missing_file")
        else:
            actual = sha256_file(payload_path)
            expected = _checksum_from_manifest(manifest, contract.payload_name)
            report.checksum = actual
            if not expected or expected != actual:
                report.reasons.append("invalid_checksum")
    else:
        report.checksum = sha256_file(manifest_path)

    if expected_checksum and expected_checksum != report.checksum:
        report.reasons.append("invalid_checksum")

    dependency_reason = _dependency_reason(contract.serialization, manifest, contract)
    if dependency_reason:
        report.reasons.append(dependency_reason)

    neural_files = ("mappings.json", "config.json")
    if family == "neural":
        for name in neural_files:
            try:
                path = resolve_trusted(directory, name)
            except UnsafePathError:
                report.reasons.append("unsafe_path")
                continue
            if not path.is_file():
                report.reasons.append("missing_file")

    report.ok = not report.reasons
    report.reasons = list(dict.fromkeys(report.reasons))
    return report


def _feature_schema(family: str, manifest: dict[str, Any], expected: str) -> str:
    if family == "content":
        config = manifest.get("feature_config")
        return expected if isinstance(config, dict) else ""
    if family in {"collaborative", "neural"}:
        value = manifest.get("feature_version")
        return str(value) if isinstance(value, str) else ""
    if family == "demand_forecast":
        value = manifest.get("feature_schema")
        return str(value) if isinstance(value, str) else ""
    if family == "hybrid":
        content = manifest.get("content_model_version")
        collaborative = manifest.get("collaborative_model_version")
        if (
            isinstance(content, str)
            and isinstance(collaborative, str)
            and content
            and collaborative
        ):
            return expected
        return ""
    return ""


def _dependency_reason(
    serialization: str,
    manifest: dict[str, Any],
    contract: Any,
) -> str:
    if not contract.requires_dependency:
        return ""
    key = "pytorch_version" if serialization == "torch_state_dict" else "sklearn_version"
    declared = manifest.get(key)
    if not isinstance(declared, str) or not declared:
        return "dependency_not_declared"
    installed = _installed_dependency(serialization)
    if installed is None:
        return "dependency_not_declared"
    if _major_minor(declared) != _major_minor(installed):
        return "incompatible_dependency"
    return ""

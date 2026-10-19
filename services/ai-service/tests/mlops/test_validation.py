import hashlib
import json
from pathlib import Path

import joblib
import pytest
import sklearn
import torch

from app.mlops.paths import UnsafePathError, resolve_trusted
from app.mlops.validation import validate_directory


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _content_dir(root: Path, *, checksum: str | None = None, version: str = "content-v1") -> Path:
    root.mkdir(parents=True, exist_ok=True)
    payload = root / "model.joblib"
    payload.write_bytes(b"not-a-real-model")
    digest = checksum if checksum is not None else _sha(payload)
    manifest = {
        "format_version": 1,
        "model_version": version,
        "artifact_version": version,
        "dataset_fingerprint": "fp-1",
        "trained_at": "2026-01-01T00:00:00+00:00",
        "feature_config": {"text": True},
        "sklearn_version": sklearn.__version__,
        "serialization": "joblib",
        "files": {"model.joblib": {"sha256": digest}},
    }
    (root / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return root


def test_valid_checksum(tmp_path: Path) -> None:
    report = validate_directory("content", _content_dir(tmp_path / "content-v1"))
    assert report.ok
    assert report.checksum
    assert "invalid_checksum" not in report.reasons


def test_invalid_checksum(tmp_path: Path) -> None:
    report = validate_directory(
        "content",
        _content_dir(tmp_path / "content-v1", checksum="a" * 64),
    )
    assert not report.ok
    assert "invalid_checksum" in report.reasons


def test_missing_file(tmp_path: Path) -> None:
    directory = tmp_path / "content-v1"
    directory.mkdir()
    (directory / "manifest.json").write_text(
        json.dumps(
            {
                "format_version": 1,
                "model_version": "content-v1",
                "feature_config": {"text": True},
                "sklearn_version": sklearn.__version__,
                "serialization": "joblib",
                "files": {"model.joblib": {"sha256": "abc"}},
            }
        ),
        encoding="utf-8",
    )
    report = validate_directory("content", directory)
    assert "missing_file" in report.reasons


def test_unsupported_version(tmp_path: Path) -> None:
    report = validate_directory(
        "content",
        _content_dir(tmp_path / "content-v1", version="content-experimental"),
    )
    assert "unsupported_version" in report.reasons


def test_unsafe_path_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(UnsafePathError):
        resolve_trusted(tmp_path, "../secrets.json")
    directory = _content_dir(tmp_path / "content-v1")
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    manifest["files"]["../secrets.json"] = {"sha256": "abc"}
    (directory / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    report = validate_directory("content", directory)
    assert "unsafe_path" in report.reasons


def test_incompatible_feature_schema(tmp_path: Path) -> None:
    directory = tmp_path / "collaborative-v1"
    directory.mkdir()
    payload = directory / "model.joblib"
    payload.write_bytes(b"collaborative")
    manifest = {
        "format_version": 1,
        "model_version": "collaborative-v1",
        "feature_version": "other-schema",
        "sklearn_version": sklearn.__version__,
        "serialization": "joblib",
        "files": {"model.joblib": {"sha256": _sha(payload)}},
    }
    (directory / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    report = validate_directory("collaborative", directory)
    assert "incompatible_feature_schema" in report.reasons


def test_untrusted_serialization_is_not_loaded(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def fail_load(*_args: object, **_kwargs: object) -> None:
        raise AssertionError("unpickle")

    monkeypatch.setattr(joblib, "load", fail_load)
    monkeypatch.setattr(torch, "load", fail_load)
    directory = _content_dir(tmp_path / "content-v1")
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    manifest["serialization"] = "pickle"
    (directory / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    report = validate_directory("content", directory)
    assert "untrusted_serialization" in report.reasons
    assert not report.ok


def test_unsupported_family(tmp_path: Path) -> None:
    report = validate_directory("rag", tmp_path)
    assert report.reasons == ["unsupported_family"]


def test_forecast_checksum_without_loading(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        joblib, "load", lambda *_a, **_k: (_ for _ in ()).throw(AssertionError("load"))
    )
    directory = tmp_path / "forecasting" / "demand-forecast-v1"
    directory.mkdir(parents=True)
    payload = directory / "regressor.joblib"
    payload.write_bytes(b"forecast")
    metadata = {
        "model_version": "demand-forecast-v1",
        "feature_schema": "forecast-features-v1",
        "checksum_sha256": _sha(payload),
        "serialization": "joblib",
        "dataset_fingerprint": "sales-1",
        "trained_at": "2026-02-01T00:00:00+00:00",
    }
    (directory / "metadata.json").write_text(json.dumps(metadata), encoding="utf-8")
    report = validate_directory("demand_forecast", directory)
    assert report.ok
    assert report.feature_schema_version == "forecast-features-v1"

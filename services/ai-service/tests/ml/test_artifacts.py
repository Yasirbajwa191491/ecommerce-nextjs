import json
from pathlib import Path

import pytest

from app.ml.errors import ArtifactError, IncompatibleArtifactError
from app.ml.models.artifacts import (
    MANIFEST_FILENAME,
    MODEL_FILENAME,
    atomic_directory,
    load_recommender,
    save_artifacts,
    sha256_file,
)
from app.ml.preprocessing.products import dataset_fingerprint
from tests.ml.support import product_record


def _trained_pair(tmp_path: Path) -> tuple[Path, object]:
    from app.ml.models.content_recommender import ContentRecommender

    model = ContentRecommender()
    records = (
        product_record("alpha", description="Wireless noise cancelling headphones"),
        product_record("beta", description="Bluetooth headphones", company="Lumen Labs"),
    )
    summary = model.fit(records)
    destination = tmp_path / "content-v1"
    manifest = save_artifacts(destination, model, summary, trained_at="2026-10-14T00:00:00+00:00")
    return destination, (model, records, manifest)


def test_save_and_reload_round_trip(tmp_path: Path) -> None:
    destination, packed = _trained_pair(tmp_path)
    original, records, manifest = packed
    assert manifest["dataset_fingerprint"] == dataset_fingerprint(records)
    assert manifest["model_version"] == "content-v1"
    assert (destination / MODEL_FILENAME).is_file()
    assert (destination / MANIFEST_FILENAME).is_file()
    reloaded, loaded_manifest = load_recommender(destination, trusted=True)
    assert loaded_manifest["dataset_fingerprint"] == manifest["dataset_fingerprint"]
    assert reloaded.recommend("alpha", top_k=1) == original.recommend("alpha", top_k=1)


def test_untrusted_load_is_refused(tmp_path: Path) -> None:
    destination, _packed = _trained_pair(tmp_path)
    with pytest.raises(ArtifactError, match="Refusing to load"):
        load_recommender(destination, trusted=False)


def test_missing_artifact_directory(tmp_path: Path) -> None:
    with pytest.raises(ArtifactError, match="not found"):
        load_recommender(tmp_path / "missing", trusted=True)


def test_incompatible_model_version(tmp_path: Path) -> None:
    destination, _packed = _trained_pair(tmp_path)
    manifest_path = destination / MANIFEST_FILENAME
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["model_version"] = "content-v0"
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(IncompatibleArtifactError, match="Incompatible model version"):
        load_recommender(destination, trusted=True)


def test_incompatible_sklearn_version(tmp_path: Path) -> None:
    destination, _packed = _trained_pair(tmp_path)
    manifest_path = destination / MANIFEST_FILENAME
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["sklearn_version"] = "0.24.2"
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(IncompatibleArtifactError, match="scikit-learn"):
        load_recommender(destination, trusted=True)


def test_checksum_mismatch(tmp_path: Path) -> None:
    destination, _packed = _trained_pair(tmp_path)
    model_path = destination / MODEL_FILENAME
    payload = bytearray(model_path.read_bytes())
    payload[0] ^= 0xFF
    model_path.write_bytes(payload)
    with pytest.raises(ArtifactError, match="checksum"):
        load_recommender(destination, trusted=True)


def test_corrupt_payload_with_a_matching_checksum(tmp_path: Path) -> None:
    destination, _packed = _trained_pair(tmp_path)
    model_path = destination / MODEL_FILENAME
    model_path.write_bytes(b"not-a-model")
    manifest_path = destination / MANIFEST_FILENAME
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["files"][MODEL_FILENAME]["sha256"] = sha256_file(model_path)
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(ArtifactError, match="could not be read"):
        load_recommender(destination, trusted=True)


def test_failed_publish_does_not_replace_the_previous_directory(tmp_path: Path) -> None:
    destination = tmp_path / "content-v1"
    destination.mkdir()
    (destination / "marker.txt").write_text("old", encoding="utf-8")
    with pytest.raises(RuntimeError, match="boom"), atomic_directory(destination) as staging:
        (staging / "new.txt").write_text("new", encoding="utf-8")
        raise RuntimeError("boom")
    assert (destination / "marker.txt").read_text(encoding="utf-8") == "old"
    assert not (destination / "new.txt").exists()
    assert list(destination.parent.glob(".content-v1.staging-*")) == []

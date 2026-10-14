import json
from pathlib import Path

import pytest

from training.publish_snapshot import prepare_snapshot, publish_snapshot, snapshot_id_for

FINGERPRINT = "ab" * 32


def _manifest(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "model_version": "content-v1",
        "artifact_version": "content-v1-abcdefabcdef",
        "dataset_fingerprint": FINGERPRINT,
        "dataset_source": "real_catalog",
        "top_k": 2,
        "product_count": 1,
        "generated_at": "2026-01-02T03:04:05+00:00",
    }
    payload.update(overrides)
    return payload


def _row() -> dict[str, object]:
    return {
        "product_id": "product-a",
        "recommended_product_ids": ["product-b"],
        "scores": [0.5],
    }


def _write(
    directory: Path, manifest: dict[str, object], rows: list[dict[str, object]]
) -> tuple[Path, Path]:
    manifest_path = directory / "recommendations.manifest.json"
    recommendations_path = directory / "recommendations.jsonl"
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    recommendations_path.write_text(
        "".join(json.dumps(row) + "\n" for row in rows),
        encoding="utf-8",
    )
    return manifest_path, recommendations_path


def test_same_catalog_can_be_published_again() -> None:
    first = snapshot_id_for(FINGERPRINT, 1_700_000_000_000)
    second = snapshot_id_for(FINGERPRINT, 1_700_000_000_001)
    assert first != second
    assert first.startswith("snap-abababababab-")


def test_truncated_recommendation_file_is_rejected_before_convex(tmp_path: Path) -> None:
    manifest_path, recommendations_path = _write(tmp_path, _manifest(product_count=2), [_row()])
    calls: list[str] = []

    def post(_base: str, _token: str, path: str, _payload: dict[str, object]) -> dict[str, object]:
        calls.append(path)
        return {}

    with pytest.raises(RuntimeError, match="does not match the manifest product count"):
        publish_snapshot(
            "https://example.convex.site",
            "test-token",
            manifest_path=manifest_path,
            recommendations_path=recommendations_path,
            snapshot_id=None,
            now_ms=1_700_000_000_000,
            post=post,
        )
    assert calls == []


def test_failed_append_marks_the_staging_snapshot_failed(tmp_path: Path) -> None:
    manifest_path, recommendations_path = _write(tmp_path, _manifest(), [_row()])
    calls: list[str] = []

    def post(_base: str, _token: str, path: str, payload: dict[str, object]) -> dict[str, object]:
        calls.append(path)
        if path.endswith("/append"):
            raise RuntimeError("snapshot request failed with status 400")
        assert "test-token" not in json.dumps(payload)
        return {"ok": True}

    with pytest.raises(RuntimeError, match="status 400"):
        publish_snapshot(
            "https://example.convex.site",
            "test-token",
            manifest_path=manifest_path,
            recommendations_path=recommendations_path,
            snapshot_id=None,
            now_ms=1_700_000_000_000,
            post=post,
        )
    assert calls == [
        "/ml/recommendations/snapshots",
        "/ml/recommendations/snapshots/append",
        "/ml/recommendations/snapshots/fail",
    ]


def test_prepare_snapshot_rejects_self_and_duplicate_targets() -> None:
    with pytest.raises(RuntimeError, match="invalid row"):
        prepare_snapshot(
            _manifest(),
            [
                {
                    "product_id": "product-a",
                    "recommended_product_ids": ["product-a"],
                    "scores": [0.2],
                }
            ],
            snapshot_id="snap-manual-01",
            now_ms=1_700_000_000_000,
        )

"""Import a generated recommendation batch into a Convex snapshot.

Requires CATALOG_EXPORT_URL and CATALOG_EXPORT_TOKEN. The token is not printed.
Publication happens only after every batch is accepted. A repeat run of the same
catalog gets a new snapshot id. If import fails after the snapshot is created,
the staging snapshot is marked failed and is not published.
"""

import argparse
import json
import math
import os
import re
import sys
import urllib.error
import urllib.request
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

_SNAPSHOT_ID = re.compile(r"^[A-Za-z0-9_-]{8,80}$")
_FINGERPRINT = re.compile(r"^[a-f0-9]{64}$")
Poster = Callable[[str, str, str, dict[str, object]], dict[str, object]]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Publish a content recommendation snapshot.")
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--recommendations", type=Path, required=True)
    parser.add_argument("--snapshot-id", default=None)
    args = parser.parse_args(argv)
    base_url = os.environ.get("CATALOG_EXPORT_URL", "").strip()
    token = os.environ.get("CATALOG_EXPORT_TOKEN", "").strip()
    if not base_url or not token:
        print("error: CATALOG_EXPORT_URL and CATALOG_EXPORT_TOKEN are required", file=sys.stderr)
        return 1
    try:
        result = publish_snapshot(
            base_url,
            token,
            manifest_path=args.manifest,
            recommendations_path=args.recommendations,
            snapshot_id=args.snapshot_id,
        )
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(result))
    return 0


def snapshot_id_for(fingerprint: str, now_ms: int) -> str:
    """Build a snapshot id that can be published again for the same catalog."""

    if not _FINGERPRINT.fullmatch(fingerprint):
        raise RuntimeError("Dataset fingerprint is invalid")
    if now_ms <= 0:
        raise RuntimeError("Snapshot time is invalid")
    candidate = f"snap-{fingerprint[:12]}-{now_ms}"
    if not _SNAPSHOT_ID.fullmatch(candidate):
        raise RuntimeError("Snapshot id is invalid")
    return candidate


def prepare_snapshot(
    manifest: dict[str, object],
    rows: list[dict[str, object]],
    *,
    snapshot_id: str | None,
    now_ms: int,
) -> dict[str, object]:
    """Validate a batch locally before any Convex write."""

    fingerprint = manifest.get("dataset_fingerprint")
    if not isinstance(fingerprint, str):
        raise RuntimeError("Dataset fingerprint is invalid")
    product_count = manifest.get("product_count")
    if not isinstance(product_count, int) or isinstance(product_count, bool):
        raise RuntimeError("Recommendation manifest is missing product_count")
    if product_count != len(rows) or product_count < 1:
        raise RuntimeError("Recommendation file does not match the manifest product count")
    top_k = manifest.get("top_k")
    if not isinstance(top_k, int) or isinstance(top_k, bool) or top_k < 1 or top_k > 16:
        raise RuntimeError("top_k must be between 1 and 16 for a Convex snapshot")
    if manifest.get("model_version") != "content-v1":
        raise RuntimeError("Model version must be content-v1")
    dataset_source = manifest.get("dataset_source")
    if dataset_source not in {"synthetic", "real_catalog"}:
        raise RuntimeError("Dataset source is invalid")
    artifact_version = manifest.get("artifact_version")
    if not isinstance(artifact_version, str) or not artifact_version.startswith("content-v1"):
        raise RuntimeError("Artifact version is invalid")
    generated_at_raw = manifest.get("generated_at")
    if not isinstance(generated_at_raw, str):
        raise RuntimeError("generated_at is invalid")
    try:
        generated_at = int(datetime.fromisoformat(generated_at_raw).timestamp() * 1000)
    except ValueError as exc:
        raise RuntimeError("generated_at is invalid") from exc
    if generated_at <= 0:
        raise RuntimeError("generated_at is invalid")

    seen: set[str] = set()
    payload_rows: list[dict[str, object]] = []
    for row in rows:
        product_id = row.get("product_id")
        targets = row.get("recommended_product_ids")
        scores = row.get("scores")
        if not isinstance(product_id, str) or product_id in seen:
            raise RuntimeError("Recommendation file has a duplicate or missing source product")
        if not isinstance(targets, list) or not isinstance(scores, list):
            raise RuntimeError("Recommendation file has an invalid row")
        if len(targets) != len(scores) or len(targets) > top_k:
            raise RuntimeError("Recommendation file has an invalid row")
        if any(not isinstance(target, str) or target == product_id for target in targets):
            raise RuntimeError("Recommendation file has an invalid row")
        if len(set(targets)) != len(targets):
            raise RuntimeError("Recommendation file has an invalid row")
        if any(not _valid_score(score) for score in scores):
            raise RuntimeError("Recommendation file has an invalid row")
        seen.add(product_id)
        payload_rows.append(
            {
                "productId": product_id,
                "recommendedProductIds": targets,
                "scores": scores,
            }
        )

    chosen_id = snapshot_id if snapshot_id is not None else snapshot_id_for(fingerprint, now_ms)
    if not _SNAPSHOT_ID.fullmatch(chosen_id):
        raise RuntimeError("Snapshot id is invalid")
    return {
        "snapshotId": chosen_id,
        "create": {
            "snapshotId": chosen_id,
            "modelVersion": "content-v1",
            "artifactVersion": artifact_version,
            "datasetFingerprint": fingerprint,
            "datasetSource": dataset_source,
            "expectedProductCount": product_count,
            "topK": top_k,
            "generatedAt": generated_at,
        },
        "rows": payload_rows,
    }


def publish_snapshot(
    base_url: str,
    token: str,
    *,
    manifest_path: Path,
    recommendations_path: Path,
    snapshot_id: str | None,
    now_ms: int | None = None,
    post: Poster | None = None,
) -> dict[str, object]:
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError("Recommendation manifest could not be read") from exc
    if not isinstance(manifest, dict):
        raise RuntimeError("Recommendation manifest could not be read")
    try:
        parsed_rows = [
            json.loads(line)
            for line in recommendations_path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError("Recommendation file could not be read") from exc
    if any(not isinstance(row, dict) for row in parsed_rows):
        raise RuntimeError("Recommendation file has an invalid row")
    rows: list[dict[str, object]] = parsed_rows
    stamp = now_ms if now_ms is not None else int(datetime.now(UTC).timestamp() * 1000)
    prepared = prepare_snapshot(manifest, rows, snapshot_id=snapshot_id, now_ms=stamp)
    sender = post or _post
    chosen_id = str(prepared["snapshotId"])
    create_body = prepared["create"]
    payload_rows = prepared["rows"]
    if not isinstance(create_body, dict) or not isinstance(payload_rows, list):
        raise RuntimeError("Recommendation file has an invalid row")
    created = False
    try:
        sender(base_url, token, "/ml/recommendations/snapshots", create_body)
        created = True
        for start in range(0, len(payload_rows), 20):
            sender(
                base_url,
                token,
                "/ml/recommendations/snapshots/append",
                {"snapshotId": chosen_id, "rows": payload_rows[start : start + 20]},
            )
        published = sender(
            base_url,
            token,
            "/ml/recommendations/snapshots/publish",
            {"snapshotId": chosen_id},
        )
    except Exception as exc:
        if created:
            _mark_failed(sender, base_url, token, chosen_id, exc)
        raise
    return {"snapshotId": chosen_id, "published": published}


def _mark_failed(
    sender: Poster,
    base_url: str,
    token: str,
    snapshot_id: str,
    exc: Exception,
) -> None:
    message = str(exc).replace("\n", " ")[:300] or "Snapshot import failed"
    try:
        sender(
            base_url,
            token,
            "/ml/recommendations/snapshots/fail",
            {"snapshotId": snapshot_id, "error": message},
        )
    except Exception:
        return


def _valid_score(score: object) -> bool:
    if isinstance(score, bool) or not isinstance(score, int | float):
        return False
    value = float(score)
    return math.isfinite(value) and 0 <= value <= 1


def _post(base_url: str, token: str, path: str, payload: dict[str, object]) -> dict[str, object]:
    request = urllib.request.Request(
        base_url.rstrip("/") + path,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:300]
        raise RuntimeError(f"snapshot request failed with status {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError("snapshot request could not be reached") from exc
    if not isinstance(body, dict):
        raise RuntimeError("snapshot request returned an invalid response")
    return body


if __name__ == "__main__":
    raise SystemExit(main())

"""Bounded offline generation of content recommendations.

This writes a JSONL file for Convex import. It does not start FastAPI and it
does not call Convex.
"""

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

from app.ml.constants import MAX_TOP_K
from app.ml.errors import MachineLearningError, TrainingError
from app.ml.inference.recommendations import RecommendationModel


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate a bounded recommendation batch.")
    parser.add_argument("--artifacts", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--top-k", type=int, default=8)
    args = parser.parse_args(argv)
    try:
        model = RecommendationModel.load(args.artifacts, trusted=True)
        payload = write_batch(model, args.output, top_k=args.top_k)
    except MachineLearningError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(payload, indent=2))
    return 0


def recommendation_rows(model: RecommendationModel, top_k: int) -> list[dict[str, object]]:
    if top_k < 1 or top_k > MAX_TOP_K:
        raise TrainingError("top_k is outside the supported range")
    rows: list[dict[str, object]] = []
    for result in model.recommend_eligible(top_k):
        ids: list[str] = []
        scores: list[float] = []
        seen: set[str] = set()
        for item in result.recommendations:
            if item.product_id == result.query_product_id or item.product_id in seen:
                raise TrainingError("Recommendation batch failed validation")
            if not 0 <= item.score <= 1:
                raise TrainingError("Recommendation batch failed validation")
            seen.add(item.product_id)
            ids.append(item.product_id)
            scores.append(item.score)
        rows.append(
            {
                "product_id": result.query_product_id,
                "recommended_product_ids": ids,
                "scores": scores,
            }
        )
    return rows


def write_batch(model: RecommendationModel, output: Path, *, top_k: int) -> dict[str, object]:
    rows = recommendation_rows(model, top_k)
    output.parent.mkdir(parents=True, exist_ok=True)
    lines = [json.dumps(row, sort_keys=True, separators=(",", ":")) for row in rows]
    _replace_text(output, "\n".join(lines) + ("\n" if lines else ""))
    manifest = {
        "model_version": model.model_version,
        "artifact_version": model.artifact_version,
        "dataset_fingerprint": model.dataset_fingerprint,
        "dataset_source": model.dataset_source,
        "top_k": top_k,
        "product_count": len(rows),
        "generated_at": datetime.now(UTC).isoformat(),
        "recommendations_file": output.name,
    }
    manifest_path = output.with_suffix(".manifest.json")
    _replace_text(manifest_path, json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    return manifest


def _replace_text(path: Path, text: str) -> None:
    temporary = path.with_name(f".{path.name}.tmp")
    temporary.write_text(text, encoding="utf-8", newline="\n")
    temporary.replace(path)


if __name__ == "__main__":
    raise SystemExit(main())

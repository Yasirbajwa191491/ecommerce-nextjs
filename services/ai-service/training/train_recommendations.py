"""Fit the content recommender and publish a versioned artifact directory."""

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

from app.ml.constants import MODEL_VERSION
from app.ml.errors import MachineLearningError, TrainingError
from app.ml.models.artifacts import library_versions, save_artifacts
from app.ml.models.content_recommender import ContentRecommender
from app.ml.preprocessing.products import (
    dataset_fingerprint,
    load_product_jsonl,
    order_for_training,
)

SERVICE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = SERVICE_ROOT / "datasets" / "synthetic" / "products.jsonl"
DEFAULT_OUTPUT = SERVICE_ROOT / "artifacts" / "recommendations" / "content-v1"
DEFAULT_RUNS = SERVICE_ROOT / "artifacts" / "recommendations" / "runs"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Train the content recommendation model.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--source", choices=("synthetic", "real_catalog"), default="synthetic")
    args = parser.parse_args(argv)
    try:
        report = train(args.dataset, args.output, source=args.source)
    except MachineLearningError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(report, indent=2))
    return 0


def train(
    dataset_path: Path,
    output_path: Path | None = None,
    *,
    source: str = "synthetic",
) -> dict[str, object]:
    if source not in {"synthetic", "real_catalog"}:
        raise TrainingError("Dataset source must be synthetic or real_catalog")
    validation = load_product_jsonl(dataset_path)
    records = order_for_training(validation.accepted, source)
    if not records:
        raise TrainingError("Cannot train on an empty dataset")
    fingerprint = dataset_fingerprint(records)
    artifact_version = (
        MODEL_VERSION if source == "synthetic" else f"{MODEL_VERSION}-{fingerprint[:12]}"
    )
    destination = _resolve_output(source, output_path, artifact_version)
    if source == "real_catalog" and destination.exists():
        raise TrainingError("Refusing to overwrite an existing real-catalog artifact directory")
    model = ContentRecommender()
    summary = model.fit(records)
    manifest = save_artifacts(
        destination,
        model,
        summary,
        artifact_version=artifact_version,
        dataset_source=source,
    )
    prices = pd.Series([record.price for record in records], dtype="float64")
    categories = (
        pd.Series([record.category_slug for record in records])
        .value_counts()
        .sort_index()
        .to_dict()
    )
    return {
        "dataset_source": source,
        "artifact_version": artifact_version,
        "accepted_rows": len(validation.accepted),
        "rejected_rows": len(validation.rejected),
        "rejection_reasons": validation.reason_counts,
        "inactive_rows": sum(1 for record in validation.accepted if not record.active),
        "price_min": float(prices.min()),
        "price_max": float(prices.max()),
        "price_mean": round(float(prices.mean()), 4),
        "category_counts": {str(key): int(value) for key, value in categories.items()},
        "dataset_fingerprint": fingerprint,
        "training": summary.to_dict(),
        "library_versions": library_versions(),
        "artifact_dir": str(destination),
        "trained_at": manifest["trained_at"],
    }


def _resolve_output(source: str, output_path: Path | None, artifact_version: str) -> Path:
    if source == "synthetic":
        return output_path if output_path is not None else DEFAULT_OUTPUT
    if output_path is not None and output_path.name == "content-v1":
        raise TrainingError(
            "Refusing to write a real catalog model into the content-v1 artifact directory"
        )
    if output_path is None or output_path.name == "runs":
        parent = output_path if output_path is not None else DEFAULT_RUNS
        return parent / artifact_version
    return output_path


if __name__ == "__main__":
    raise SystemExit(main())

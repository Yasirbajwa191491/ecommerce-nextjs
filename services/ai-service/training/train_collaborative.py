"""Fit the item-item collaborative model and publish its artifact."""

import argparse
import json
import sys
from pathlib import Path

from app.ml.behavioral.constants import COLLABORATIVE_MODEL_VERSION
from app.ml.behavioral.preprocess import (
    aggregate_events,
    interaction_fingerprint,
    load_interactions,
)
from app.ml.behavioral.schema import load_event_jsonl
from app.ml.behavioral.weights import weight_config
from app.ml.errors import MachineLearningError
from app.ml.models.behavioral_artifacts import save_collaborative_artifacts
from app.ml.models.collaborative_recommender import CollaborativeRecommender

SERVICE_ROOT = Path(__file__).resolve().parents[1]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Train the collaborative filtering model.")
    parser.add_argument("--events", type=Path, default=None)
    parser.add_argument("--interactions", type=Path, default=None)
    parser.add_argument("--catalog", type=Path, default=None)
    parser.add_argument(
        "--output",
        type=Path,
        default=SERVICE_ROOT / "artifacts" / "recommendations" / COLLABORATIVE_MODEL_VERSION,
    )
    parser.add_argument("--source", choices=("synthetic", "convex_export"), default="synthetic")
    parser.add_argument("--scheme", default="default")
    parser.add_argument("--half-life-days", type=float, default=None)
    parser.add_argument("--min-product-interactions", type=int, default=2)
    parser.add_argument("--min-visitor-interactions", type=int, default=1)
    parser.add_argument("--max-neighbors", type=int, default=50)
    args = parser.parse_args(argv)
    try:
        report = train(
            output=args.output,
            events_path=args.events,
            interactions_path=args.interactions,
            catalog_path=args.catalog,
            source=args.source,
            scheme=args.scheme,
            half_life_days=args.half_life_days,
            min_product_interactions=args.min_product_interactions,
            min_visitor_interactions=args.min_visitor_interactions,
            max_neighbors=args.max_neighbors,
        )
    except MachineLearningError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


def train(
    *,
    output: Path,
    events_path: Path | None,
    interactions_path: Path | None,
    catalog_path: Path | None,
    source: str,
    scheme: str,
    half_life_days: float | None,
    min_product_interactions: int,
    min_visitor_interactions: int,
    max_neighbors: int,
) -> dict[str, object]:
    if source == "convex_export" and output.exists():
        raise MachineLearningError("Refusing to overwrite an existing convex_export artifact")
    config = weight_config(scheme, half_life_days=half_life_days)
    catalog = _catalog(catalog_path) if catalog_path else None
    if interactions_path is not None:
        rows = [
            json.loads(line)
            for line in interactions_path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        interactions = load_interactions(rows)
    elif events_path is not None:
        accepted, _rejected = load_event_jsonl(events_path)
        interactions, _report = aggregate_events(
            accepted,
            config,
            catalog_ids=set(catalog) if catalog is not None else None,
        )
    else:
        raise MachineLearningError("Provide --events or --interactions")
    fingerprint = interaction_fingerprint(interactions, config)
    model = CollaborativeRecommender()
    summary = model.fit(
        interactions,
        dataset_fingerprint=fingerprint,
        catalog_ids=catalog,
        min_product_interactions=min_product_interactions,
        min_visitor_interactions=min_visitor_interactions,
        max_neighbors=max_neighbors,
    )
    manifest = save_collaborative_artifacts(
        output,
        model,
        summary,
        dataset_source=source,
        weighting=config.to_dict(),
    )
    return {
        "artifact_dir": str(output),
        "model_version": manifest["model_version"],
        "artifact_version": manifest["artifact_version"],
        "dataset_fingerprint": manifest["dataset_fingerprint"],
        "dataset_source": source,
        "product_count": summary.product_count,
        "visitor_count": summary.visitor_count,
        "interaction_count": summary.interaction_count,
        "matrix_sparsity": summary.matrix_sparsity,
        "training_seconds": summary.training_seconds,
    }


def _catalog(path: Path) -> list[str]:
    ids: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        payload = json.loads(line)
        product_id = payload.get("product_id")
        if isinstance(product_id, str):
            ids.append(product_id)
    return sorted(set(ids))


if __name__ == "__main__":
    raise SystemExit(main())

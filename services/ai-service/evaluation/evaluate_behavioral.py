"""Train, score, and write the behavioral evaluation report.

The report is explicit when the dataset is synthetic. It does not claim a
revenue or conversion change.
"""

import argparse
import json
import sys
from pathlib import Path

from app.ml.behavioral.preprocess import aggregate_events, interaction_fingerprint
from app.ml.behavioral.schema import load_event_jsonl
from app.ml.behavioral.weights import weight_config
from app.ml.errors import MachineLearningError, UnknownProductError
from app.ml.models.collaborative_recommender import CollaborativeRecommender
from app.ml.models.content_recommender import ContentRecommender
from app.ml.models.hybrid_recommender import HybridConfig, HybridRecommender
from evaluation.behavioral import (
    assert_no_future_leakage,
    evaluation_queries,
    popularity_recommend,
    score_ranker,
    temporal_split,
)

SERVICE_ROOT = Path(__file__).resolve().parents[1]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluate behavioral recommendation models.")
    parser.add_argument("--events", type=Path, required=True)
    parser.add_argument("--catalog", type=Path, default=None)
    parser.add_argument("--content-artifact", type=Path, default=None)
    parser.add_argument("--neural-dir", type=Path, default=None)
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--k", type=int, default=5)
    parser.add_argument("--source", choices=("synthetic", "convex_export"), default="synthetic")
    args = parser.parse_args(argv)
    try:
        report = evaluate(
            args.events,
            catalog_path=args.catalog,
            content_artifact=args.content_artifact,
            neural_dir=args.neural_dir,
            k=args.k,
            source=args.source,
        )
    except MachineLearningError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    rendered = json.dumps(report, indent=2, sort_keys=True)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered + "\n", encoding="utf-8", newline="\n")
        markdown = args.output.with_suffix(".md")
        markdown.write_text(_markdown(report), encoding="utf-8", newline="\n")
    print(rendered)
    return 0


def evaluate(
    events_path: Path,
    *,
    catalog_path: Path | None = None,
    content_artifact: Path | None = None,
    neural_dir: Path | None = None,
    k: int = 5,
    source: str = "synthetic",
) -> dict[str, object]:
    accepted, rejected = load_event_jsonl(events_path)
    catalog_ids = (
        _catalog(catalog_path) if catalog_path else sorted({event.product_id for event in accepted})
    )
    split = temporal_split(accepted)
    assert_no_future_leakage(split)
    queries = evaluation_queries(split.train_events, split.test_events)
    config = weight_config("default")
    train_interactions, _report = aggregate_events(
        split.train_events,
        config,
        catalog_ids=set(catalog_ids),
    )
    fingerprint = interaction_fingerprint(train_interactions, config)
    collaborative = CollaborativeRecommender()
    collaborative.fit(
        train_interactions,
        dataset_fingerprint=fingerprint,
        catalog_ids=catalog_ids,
        min_product_interactions=1,
    )
    content = _load_content(content_artifact)
    hybrid = HybridRecommender(
        content=content,
        collaborative=collaborative,
        config=HybridConfig(dataset_fingerprint=fingerprint),
    )
    models: dict[str, object] = {
        "popularity": score_ranker(
            queries,
            popularity_recommend(train_interactions),
            k=k,
            catalog_ids=catalog_ids,
        ),
        "collaborative": score_ranker(
            queries,
            lambda product_id, limit: _ids(collaborative, product_id, limit),
            k=k,
            catalog_ids=catalog_ids,
        ),
        "hybrid": score_ranker(
            queries,
            lambda product_id, limit: _hybrid_ids(hybrid, product_id, limit),
            k=k,
            catalog_ids=catalog_ids,
        ),
        "neural": _neural_metrics(
            split.train_events,
            queries,
            catalog_ids=catalog_ids,
            k=k,
            held_out_events=len(split.test_events),
            outer_cutoff=split.cutoff,
            neural_dir=neural_dir,
            source=source,
        ),
    }
    if content is None:
        models["content"] = {"available": False, "reason": "content_artifact_not_loaded"}
    else:
        models["content"] = score_ranker(
            queries,
            lambda product_id, limit: _content_ids(content, product_id, limit),
            k=k,
            catalog_ids=catalog_ids,
        )
    schemes = {}
    for scheme in ("uniform", "purchase_heavy"):
        scheme_config = weight_config(scheme)
        scheme_interactions, _ignored = aggregate_events(
            split.train_events,
            scheme_config,
            catalog_ids=set(catalog_ids),
        )
        scheme_model = CollaborativeRecommender()
        scheme_model.fit(
            scheme_interactions,
            dataset_fingerprint=interaction_fingerprint(scheme_interactions, scheme_config),
            catalog_ids=catalog_ids,
            min_product_interactions=1,
        )
        schemes[scheme] = score_ranker(
            queries,
            lambda product_id, limit, model=scheme_model: _ids(model, product_id, limit),
            k=k,
            catalog_ids=catalog_ids,
        )
    confidence = "low_sample" if len(queries) < 20 else "limited"
    return {
        "dataset_source": source,
        "synthetic": source == "synthetic",
        "warning": (
            "Offline metrics on this dataset are not customer performance, "
            "conversion, or revenue uplift."
        ),
        "cutoff": split.cutoff.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "k": k,
        "rejected_events": len(rejected),
        "train_events": len(split.train_events),
        "test_events": len(split.test_events),
        "evaluated_queries": len(queries),
        "insufficient_data": len(queries) == 0,
        "confidence": confidence,
        "comparison_note": (
            "Every model is scored on the same temporal queries and relevance labels. "
            "Neural scores are product-embedding cosine similarity, not purchase probabilities. "
            "A lower neural score than a simpler baseline is a valid result."
        ),
        "models": models,
        "weight_schemes": schemes,
    }


def _ids(model: CollaborativeRecommender, product_id: str, limit: int) -> list[str]:
    try:
        result = model.recommend(product_id, limit)
    except UnknownProductError:
        return []
    return [item.product_id for item in result.recommendations]


def _content_ids(model: ContentRecommender, product_id: str, limit: int) -> list[str]:
    try:
        result = model.recommend(product_id, limit)
    except UnknownProductError:
        return []
    return [item.product_id for item in result.recommendations]


def _hybrid_ids(model: HybridRecommender, product_id: str, limit: int) -> list[str]:
    try:
        result = model.recommend(product_id, limit, strategy="hybrid")
    except (UnknownProductError, MachineLearningError):
        return []
    return [item.product_id for item in result.recommendations]


def _neural_metrics(
    train_events: list,
    queries: list,
    *,
    catalog_ids: list[str],
    k: int,
    held_out_events: int,
    outer_cutoff: object,
    neural_dir: Path | None,
    source: str,
) -> dict[str, object]:
    from datetime import datetime

    from app.ml.errors import TrainingError
    from app.ml.models.neural_artifacts import attach_neural_evaluation
    from app.ml.neural.config import evaluation_config
    from app.ml.neural.pipeline import fit_neural_model

    cutoff = outer_cutoff if isinstance(outer_cutoff, datetime) else None
    try:
        model, report = fit_neural_model(
            train_events,
            catalog_ids=catalog_ids,
            config=evaluation_config(),
            held_out_events=held_out_events,
            outer_cutoff=cutoff,
        )
    except TrainingError as exc:
        return {"available": False, "reason": str(exc)}

    def recommend(product_id: str, limit: int) -> list[str]:
        try:
            result = model.recommend(product_id, limit)
        except UnknownProductError:
            return []
        if result.cold_start:
            return []
        return [item.product_id for item in result.recommendations]

    metrics = score_ranker(queries, recommend, k=k, catalog_ids=catalog_ids)
    metrics["score_kind"] = "product_embedding_cosine"
    metrics["training_seconds"] = report.get("training_seconds")
    metrics["note"] = (
        "Scores are cosine similarity of learned product embeddings, "
        "not predicted purchase probabilities."
    )
    if neural_dir is not None:
        summary = {
            "warning": (
                "Offline metrics on this dataset are not customer performance, "
                "conversion, or revenue uplift."
            ),
            "synthetic": source == "synthetic",
            "precision_at_k": metrics.get("precision_at_k"),
            "recall_at_k": metrics.get("recall_at_k"),
            "hit_rate_at_k": metrics.get("hit_rate_at_k"),
            "ndcg_at_k": metrics.get("ndcg_at_k"),
            "k": k,
        }
        try:
            attach_neural_evaluation(neural_dir, summary)
        except MachineLearningError:
            metrics["evaluation_attach_error"] = "neural_artifact_not_updated"
    return metrics


def _load_content(path: Path | None) -> ContentRecommender | None:
    if path is None:
        return None
    from app.ml.models.artifacts import load_recommender

    recommender, _manifest = load_recommender(path, trusted=True)
    return recommender


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


def _markdown(report: dict[str, object]) -> str:
    lines = [
        "# Behavioral evaluation",
        "",
        str(report["warning"]),
        "",
        (
            f"Source: {report['dataset_source']}. "
            f"Cutoff: {report['cutoff']}. "
            f"Queries: {report['evaluated_queries']}."
        ),
        f"Confidence: {report['confidence']}.",
        "",
        "| Model | Precision | Recall | Hit rate | NDCG | Coverage |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    models = report["models"]
    if isinstance(models, dict):
        for name, metrics in models.items():
            if not isinstance(metrics, dict) or metrics.get("available") is False:
                lines.append(f"| {name} | unavailable | | | | |")
                continue
            if metrics.get("insufficient_data"):
                lines.append(f"| {name} | insufficient data | | | | |")
                continue
            row = (
                "| {name} | {precision_at_k} | {recall_at_k} | "
                "{hit_rate_at_k} | {ndcg_at_k} | {coverage} |"
            ).format(name=name, **metrics)
            lines.append(row)
    lines.append("")
    return "\n".join(lines)


if __name__ == "__main__":
    raise SystemExit(main())

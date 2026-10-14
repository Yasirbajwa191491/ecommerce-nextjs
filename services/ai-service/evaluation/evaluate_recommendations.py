"""Compare the content model with a same-category baseline on held-out labels."""

import argparse
import json
import random
import sys
import time
from pathlib import Path
from typing import Any

import numpy as np

from app.ml.errors import MachineLearningError
from app.ml.inference.recommendations import RecommendationModel
from app.ml.preprocessing.products import ProductRecord, dataset_fingerprint, load_product_jsonl
from evaluation.baseline import same_category_baseline
from evaluation.metrics import coverage, mean, summarize_quality
from evaluation.relevance import load_relevance_jsonl

SERVICE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = SERVICE_ROOT / "datasets" / "synthetic" / "products.jsonl"
DEFAULT_RELEVANCE = SERVICE_ROOT / "datasets" / "synthetic" / "relevance.jsonl"
DEFAULT_ARTIFACTS = SERVICE_ROOT / "artifacts" / "recommendations" / "content-v1"
DEFAULT_REPORT_DIR = SERVICE_ROOT / "evaluation" / "reports"

SYNTHETIC_EVALUATION_LIMITATION = (
    "These labels were hand-authored for the synthetic catalog and stored outside the "
    "feature columns. Products in a label group were also written with similar wording, "
    "so high scores show that the pipeline can recover that authored structure. They are "
    "not evidence of real-world recommendation quality, personalization, conversion, or "
    "sales impact. No customer events, orders, or production catalog rows were used."
)

METRIC_DEFINITIONS = {
    "precision_at_k": "Relevant items in the top K, divided by K.",
    "recall_at_k": "Relevant items in the top K, divided by the number of relevant items.",
    "hit_rate_at_k": "Fraction of labeled queries with at least one relevant item in the top K.",
    "coverage": "Distinct recommended items divided by the number of eligible products.",
    "category_diversity": (
        "Mean fraction of distinct category slugs inside each non-empty recommendation list. "
        "Descriptive only."
    ),
    "intra_list_diversity": (
        "Mean pairwise cosine distance in the fitted content space. Descriptive only, "
        "and not an independent ground truth."
    ),
}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluate the content recommendation model.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--relevance", type=Path, default=DEFAULT_RELEVANCE)
    parser.add_argument("--artifacts", type=Path, default=DEFAULT_ARTIFACTS)
    parser.add_argument("--report-dir", type=Path, default=DEFAULT_REPORT_DIR)
    parser.add_argument("--k", type=int, default=5)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args(argv)
    try:
        report = evaluate(
            dataset_path=args.dataset,
            relevance_path=args.relevance,
            artifacts_path=args.artifacts,
            k=args.k,
            seed=args.seed,
        )
    except MachineLearningError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    args.report_dir.mkdir(parents=True, exist_ok=True)
    version = str(report["model_version"])
    json_path = args.report_dir / f"{version}-report.json"
    summary_path = args.report_dir / f"{version}-summary.md"
    json_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    summary_path.write_text(render_summary(report), encoding="utf-8", newline="\n")
    print(render_summary(report))
    print(f"Wrote {json_path}")
    print(f"Wrote {summary_path}")
    return 0


def evaluate(
    *,
    dataset_path: Path,
    relevance_path: Path,
    artifacts_path: Path,
    k: int,
    seed: int,
) -> dict[str, Any]:
    random.seed(seed)
    np.random.seed(seed)
    validation = load_product_jsonl(dataset_path)
    if not validation.accepted:
        raise MachineLearningError("Cannot evaluate an empty dataset")
    relevance = load_relevance_jsonl(relevance_path)
    model = RecommendationModel.load(artifacts_path, trusted=True)
    fingerprint = dataset_fingerprint(validation.accepted)
    eligible = [record for record in validation.accepted if record.active]
    catalog_ids = [record.product_id for record in eligible]
    category_by_id = {record.product_id: record.category_slug for record in validation.accepted}

    model_lists: list[list[str]] = []
    baseline_lists: list[list[str]] = []
    model_cases: list[tuple[list[str], set[str]]] = []
    baseline_cases: list[tuple[list[str], set[str]]] = []
    model_latency_ms: list[float] = []
    baseline_latency_ms: list[float] = []
    model_category_diversity: list[float] = []
    baseline_category_diversity: list[float] = []
    model_content_diversity: list[float] = []
    baseline_content_diversity: list[float] = []

    for record in eligible:
        labels = set(relevance.get(record.product_id, set()))
        labels.discard(record.product_id)
        started = time.perf_counter()
        result = model.recommend(record.product_id, top_k=k)
        model_latency_ms.append((time.perf_counter() - started) * 1000)
        recommended = [item.product_id for item in result.recommendations]
        baseline_started = time.perf_counter()
        baseline = same_category_baseline(record.product_id, validation.accepted, k)
        baseline_latency_ms.append((time.perf_counter() - baseline_started) * 1000)
        model_lists.append(recommended)
        baseline_lists.append(baseline)
        model_cases.append((recommended, labels))
        baseline_cases.append((baseline, labels))
        _append_diversity(
            recommended,
            category_by_id,
            model,
            model_category_diversity,
            model_content_diversity,
        )
        _append_diversity(
            baseline,
            category_by_id,
            model,
            baseline_category_diversity,
            baseline_content_diversity,
        )

    model_quality = summarize_quality(model_cases, k)
    baseline_quality = summarize_quality(baseline_cases, k)
    model_metrics = _metrics_payload(
        model_quality,
        catalog_coverage=coverage(model_lists, catalog_ids),
        category_diversity=mean(model_category_diversity),
        intra_list_diversity=mean(model_content_diversity),
        latency_ms=model_latency_ms,
    )
    baseline_metrics = _metrics_payload(
        baseline_quality,
        catalog_coverage=coverage(baseline_lists, catalog_ids),
        category_diversity=mean(baseline_category_diversity),
        intra_list_diversity=mean(baseline_content_diversity),
        latency_ms=baseline_latency_ms,
    )
    report: dict[str, Any] = {
        "model_name": model.model_name,
        "model_version": model.model_version,
        "dataset_fingerprint": fingerprint,
        "model_dataset_fingerprint": model.dataset_fingerprint,
        "dataset_fingerprint_matches_model": fingerprint == model.dataset_fingerprint,
        "k": k,
        "seed": seed,
        "eligible_products": len(eligible),
        "queries_evaluated": model_quality.evaluated_queries,
        "queries_skipped_empty_relevance": model_quality.skipped_empty_relevance,
        "limitation": SYNTHETIC_EVALUATION_LIMITATION,
        "definitions": METRIC_DEFINITIONS,
        "model_metrics": model_metrics,
        "baseline": {
            "name": "same_category_product_id",
            "description": (
                "Eligible products in the same category_slug, excluding the query, "
                "sorted by product id."
            ),
            "metrics": baseline_metrics,
        },
        "comparison": {
            "precision_at_k_delta": _delta(model_metrics, baseline_metrics, "precision_at_k"),
            "recall_at_k_delta": _delta(model_metrics, baseline_metrics, "recall_at_k"),
            "hit_rate_at_k_delta": _delta(model_metrics, baseline_metrics, "hit_rate_at_k"),
        },
    }
    sample = _sample_query(model, validation.accepted, k)
    if sample is not None:
        report["sample_query"] = sample
    return report


def render_summary(report: dict[str, Any]) -> str:
    model_metrics = report["model_metrics"]
    baseline_metrics = report["baseline"]["metrics"]
    lines = [
        f"# Recommendation evaluation ({report['model_version']})",
        "",
        report["limitation"],
        "",
        f"- K: {report['k']}",
        f"- Seed: {report['seed']}",
        f"- Eligible products: {report['eligible_products']}",
        f"- Labeled queries: {report['queries_evaluated']}",
        f"- Queries skipped (empty relevance): {report['queries_skipped_empty_relevance']}",
        f"- Dataset fingerprint matches model: {report['dataset_fingerprint_matches_model']}",
        "",
        "| Metric | Content model | Same-category baseline |",
        "| --- | ---: | ---: |",
        _metric_row("Precision@K", model_metrics, baseline_metrics, "precision_at_k"),
        _metric_row("Recall@K", model_metrics, baseline_metrics, "recall_at_k"),
        _metric_row("HitRate@K", model_metrics, baseline_metrics, "hit_rate_at_k"),
        _metric_row("Coverage", model_metrics, baseline_metrics, "coverage"),
        _metric_row("Category diversity", model_metrics, baseline_metrics, "category_diversity"),
        _metric_row(
            "Intra-list diversity", model_metrics, baseline_metrics, "intra_list_diversity"
        ),
        "",
        "Latency is wall time for this machine and is not a quality score.",
        "",
        f"- Model mean latency ms: {model_metrics['latency_ms']['mean']}",
        f"- Baseline mean latency ms: {baseline_metrics['latency_ms']['mean']}",
        "",
    ]
    sample = report.get("sample_query")
    if isinstance(sample, dict):
        lines.append(f"Sample query `{sample['product_id']}`:")
        lines.append("")
        for item in sample["recommendations"]:
            lines.append(
                f"- rank {item['rank']}: `{item['product_id']}` score {item['score']} "
                f"({item['model_version']})"
            )
        lines.append("")
    lines.append(
        "Category diversity and intra-list diversity describe the lists. "
        "They are not targets to maximize, and intra-list diversity reuses the model space."
    )
    lines.append("")
    return "\n".join(lines)


def _append_diversity(
    recommended: list[str],
    category_by_id: dict[str, str],
    model: RecommendationModel,
    category_scores: list[float],
    content_scores: list[float],
) -> None:
    categories = [category_by_id[item] for item in recommended if item in category_by_id]
    if categories:
        category_scores.append(len(set(categories)) / len(categories))
    content_diversity = model.pairwise_content_diversity(recommended)
    if content_diversity is not None:
        content_scores.append(content_diversity)


def _metrics_payload(
    quality: Any,
    *,
    catalog_coverage: float,
    category_diversity: float | None,
    intra_list_diversity: float | None,
    latency_ms: list[float],
) -> dict[str, Any]:
    return {
        "precision_at_k": round(quality.precision_at_k, 6),
        "recall_at_k": round(quality.recall_at_k, 6),
        "hit_rate_at_k": round(quality.hit_rate_at_k, 6),
        "coverage": round(catalog_coverage, 6),
        "category_diversity": _round_optional(category_diversity),
        "intra_list_diversity": _round_optional(intra_list_diversity),
        "evaluated_queries": quality.evaluated_queries,
        "latency_ms": _latency(latency_ms),
    }


def _latency(values: list[float]) -> dict[str, float | int]:
    if not values:
        return {"mean": 0.0, "max": 0.0, "queries": 0}
    return {
        "mean": round(sum(values) / len(values), 3),
        "max": round(max(values), 3),
        "queries": len(values),
    }


def _round_optional(value: float | None) -> float | None:
    if value is None:
        return None
    return round(value, 6)


def _delta(model_metrics: dict[str, Any], baseline_metrics: dict[str, Any], key: str) -> float:
    return round(float(model_metrics[key]) - float(baseline_metrics[key]), 6)


def _metric_row(
    label: str,
    model_metrics: dict[str, Any],
    baseline_metrics: dict[str, Any],
    key: str,
) -> str:
    model_value = _format_metric(model_metrics[key])
    baseline_value = _format_metric(baseline_metrics[key])
    return f"| {label} | {model_value} | {baseline_value} |"


def _format_metric(value: object) -> str:
    if value is None:
        return "n/a"
    if isinstance(value, float):
        return f"{value:.4f}"
    return str(value)


def _sample_query(
    model: RecommendationModel,
    records: tuple[ProductRecord, ...] | list[ProductRecord],
    k: int,
) -> dict[str, Any] | None:
    ids = {record.product_id for record in records}
    if "sample-a-01" not in ids:
        return None
    return model.recommend("sample-a-01", top_k=k).to_dict()


if __name__ == "__main__":
    raise SystemExit(main())

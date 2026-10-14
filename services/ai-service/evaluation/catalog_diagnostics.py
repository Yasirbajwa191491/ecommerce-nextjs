"""Descriptive comparison for a real catalog export.

Precision, recall, hit rate, and NDCG are included only when a relevance file
is passed. They are not production evidence unless the caller says the labels
are production labels. The live Convex ranker is not executed here.
"""

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

from app.ml.errors import MachineLearningError
from app.ml.models.content_recommender import ContentRecommender
from app.ml.preprocessing.products import load_product_jsonl, order_for_training
from evaluation.baseline import same_category_baseline
from evaluation.metrics import coverage, hit_rate_at_k, ndcg_at_k, precision_at_k, recall_at_k
from evaluation.relevance import load_relevance_jsonl

SERVICE_ROOT = Path(__file__).resolve().parents[1]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Describe catalog recommendation diagnostics.")
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--relevance", type=Path, default=None)
    parser.add_argument("--top-k", type=int, default=8)
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--production-labels", action="store_true")
    args = parser.parse_args(argv)
    try:
        report = diagnose(
            args.dataset,
            relevance_path=args.relevance,
            top_k=args.top_k,
            production_labels=args.production_labels,
        )
    except MachineLearningError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    rendered = json.dumps(report, indent=2, sort_keys=True)
    if args.output is not None:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered + "\n", encoding="utf-8", newline="\n")
    print(rendered)
    return 0


def diagnose(
    dataset_path: Path,
    *,
    relevance_path: Path | None,
    top_k: int,
    production_labels: bool = False,
) -> dict[str, object]:
    validation = load_product_jsonl(dataset_path)
    records = order_for_training(validation.accepted, "real_catalog")
    if not records:
        raise MachineLearningError("Cannot diagnose an empty dataset")
    by_id = {record.product_id: record for record in records}
    eligible = [record for record in records if record.active]
    model = ContentRecommender()
    model.fit(records)
    python_lists: list[tuple[str, list[str], list[float]]] = []
    baseline_lists: list[tuple[str, list[str]]] = []
    for record in eligible:
        result = model.recommend(record.product_id, top_k)
        python_lists.append(
            (
                record.product_id,
                [item.product_id for item in result.recommendations],
                [item.score for item in result.recommendations],
            )
        )
        baseline_lists.append(
            (
                record.product_id,
                same_category_baseline(record.product_id, records, top_k),
            )
        )
    relevance = load_relevance_jsonl(relevance_path) if relevance_path else None
    return {
        "production_quality_claim": False,
        "live_convex_ranker": "not_executed",
        "offline_baseline": "same_category_id_order",
        "catalog_products": len(records),
        "eligible_products": len(eligible),
        "inactive_products": len(records) - len(eligible),
        "rejected_rows": len(validation.rejected),
        "python_content": _describe(
            python_lists, by_id, eligible_ids=[row.product_id for row in eligible]
        ),
        "same_category_baseline": _describe(
            [(source, ids, []) for source, ids in baseline_lists],
            by_id,
            eligible_ids=[row.product_id for row in eligible],
        ),
        "quality_metrics": _quality(
            python_lists, baseline_lists, relevance, top_k, production_labels
        ),
        "note": (
            "Descriptive diagnostics are not production quality. The same-category "
            "baseline is the offline comparison. The live Convex engine remains the "
            "request-time fallback and is not scored here."
        ),
    }


def _describe(
    lists: list[tuple[str, list[str], list[float]]],
    by_id: dict,
    *,
    eligible_ids: list[str],
) -> dict[str, object]:
    recommendation_lists = [ids for _source, ids, _scores in lists]
    slots = sum(len(ids) for ids in recommendation_lists)
    duplicate_slots = sum(len(ids) - len(set(ids)) for ids in recommendation_lists)
    self_hits = sum(1 for source, ids, _scores in lists if source in ids)
    inactive_hits = 0
    categories: Counter[str] = Counter()
    diversity: list[float] = []
    scores = [score for _source, _ids, row_scores in lists for score in row_scores]
    missing = sum(1 for ids in recommendation_lists if not ids)
    for ids in recommendation_lists:
        if not ids:
            continue
        slugs = []
        for product_id in ids:
            record = by_id.get(product_id)
            if record is None or not record.active:
                inactive_hits += 1
                continue
            slugs.append(record.category_slug)
            categories[record.category_slug] += 1
        diversity.append(len(set(slugs)) / len(ids))
    return {
        "coverage": round(coverage(recommendation_lists, eligible_ids), 6),
        "diversity": round(sum(diversity) / len(diversity), 6) if diversity else 0.0,
        "inactive_recommendation_count": inactive_hits,
        "duplicate_rate": round(duplicate_slots / slots, 6) if slots else 0.0,
        "self_recommendation_rate": round(self_hits / len(lists), 6) if lists else 0.0,
        "category_distribution": dict(sorted(categories.items())),
        "score_min": round(min(scores), 6) if scores else None,
        "score_mean": round(sum(scores) / len(scores), 6) if scores else None,
        "score_max": round(max(scores), 6) if scores else None,
        "missing_recommendation_count": missing,
        "completeness": round((len(lists) - missing) / len(lists), 6) if lists else 0.0,
    }


def _quality(python_lists, baseline_lists, relevance, top_k: int, production_labels: bool):
    if relevance is None:
        return None
    python_cases = []
    baseline_cases = []
    for source, ids, _scores in python_lists:
        labels = relevance.get(source, set())
        if labels:
            python_cases.append((ids, labels))
    for source, ids in baseline_lists:
        labels = relevance.get(source, set())
        if labels:
            baseline_cases.append((ids, labels))

    def average(cases, metric):
        if not cases:
            return 0.0
        return round(sum(metric(ids, labels, top_k) for ids, labels in cases) / len(cases), 6)

    return {
        "labels_are_production_evidence": production_labels,
        "evaluated_queries": len(python_cases),
        "python_content": {
            "precision_at_k": average(python_cases, precision_at_k),
            "recall_at_k": average(python_cases, recall_at_k),
            "hit_rate_at_k": average(python_cases, hit_rate_at_k),
            "ndcg_at_k": average(python_cases, ndcg_at_k),
        },
        "same_category_baseline": {
            "precision_at_k": average(baseline_cases, precision_at_k),
            "recall_at_k": average(baseline_cases, recall_at_k),
            "hit_rate_at_k": average(baseline_cases, hit_rate_at_k),
            "ndcg_at_k": average(baseline_cases, ndcg_at_k),
        },
    }


if __name__ == "__main__":
    raise SystemExit(main())

from pathlib import Path

import pytest

from evaluation.baseline import same_category_baseline
from evaluation.evaluate_recommendations import evaluate
from evaluation.metrics import (
    coverage,
    hit_rate_at_k,
    precision_at_k,
    recall_at_k,
    summarize_quality,
)
from tests.ml.support import product_record
from training.generate_sample_data import main as generate_main
from training.train_recommendations import main as train_main


def test_precision_recall_and_hit_rate_use_the_documented_denominators() -> None:
    recommended = ["a", "b", "c"]
    relevant = {"b", "d", "e", "f"}
    assert precision_at_k(recommended, relevant, k=5) == pytest.approx(1 / 5)
    assert recall_at_k(recommended, relevant, k=5) == pytest.approx(1 / 4)
    assert hit_rate_at_k(recommended, relevant, k=5) == 1.0
    assert hit_rate_at_k(["x"], relevant, k=5) == 0.0


def test_empty_relevance_is_skipped_and_empty_catalog_coverage_is_zero() -> None:
    summary = summarize_quality([(["a"], set()), (["b"], set())], k=5)
    assert summary.evaluated_queries == 0
    assert summary.skipped_empty_relevance == 2
    assert summary.precision_at_k == 0.0
    mixed = summarize_quality([(["a"], set()), (["hit"], {"hit"})], k=5)
    assert mixed.evaluated_queries == 1
    assert mixed.skipped_empty_relevance == 1
    assert mixed.precision_at_k == pytest.approx(1 / 5)
    assert coverage([["a", "b"], ["a"]], []) == 0.0
    assert coverage([["a", "b"], ["c"]], ["a", "b", "c", "d"]) == pytest.approx(0.75)


def test_same_category_baseline_is_deterministic() -> None:
    records = (
        product_record("b", category_slug="audio"),
        product_record("a", category_slug="audio", company="Other"),
        product_record("c", category_slug="garden", category_name="Garden", company="Yard"),
        product_record("hidden", category_slug="audio", company="Quiet", active=False),
    )
    assert same_category_baseline("b", records, top_k=5) == ["a"]
    assert same_category_baseline("b", records, top_k=5) == same_category_baseline(
        "b", records, top_k=5
    )


def test_synthetic_model_beats_the_category_baseline(tmp_path: Path) -> None:
    output = tmp_path / "synthetic"
    artifacts = tmp_path / "content-v1"
    assert generate_main(["--output-dir", str(output)]) == 0
    assert (
        train_main(["--dataset", str(output / "products.jsonl"), "--output", str(artifacts)]) == 0
    )
    report = evaluate(
        dataset_path=output / "products.jsonl",
        relevance_path=output / "relevance.jsonl",
        artifacts_path=artifacts,
        k=5,
        seed=42,
    )
    again = evaluate(
        dataset_path=output / "products.jsonl",
        relevance_path=output / "relevance.jsonl",
        artifacts_path=artifacts,
        k=5,
        seed=42,
    )
    assert report["model_metrics"]["precision_at_k"] == again["model_metrics"]["precision_at_k"]
    assert report["model_metrics"]["recall_at_k"] == again["model_metrics"]["recall_at_k"]
    assert report["dataset_fingerprint_matches_model"] is True
    assert report["queries_skipped_empty_relevance"] == 1
    assert "not evidence of real-world" in report["limitation"]
    assert report["model_metrics"]["recall_at_k"] > report["baseline"]["metrics"]["recall_at_k"]
    assert (
        report["model_metrics"]["precision_at_k"] > report["baseline"]["metrics"]["precision_at_k"]
    )
    sample = report["sample_query"]
    assert sample["recommendations"][0]["product_id"] in {"sample-a-08", "sample-a-09"}
    assert "sample-a-01" not in {item["product_id"] for item in sample["recommendations"]}

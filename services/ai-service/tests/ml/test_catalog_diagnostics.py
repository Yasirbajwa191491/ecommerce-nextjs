import json
from pathlib import Path

from evaluation.catalog_diagnostics import diagnose
from tests.ml.support import product_mapping


def _write(path: Path, rows: list[dict[str, object]]) -> None:
    path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")


def test_diagnostics_omit_quality_metrics_without_labels(tmp_path: Path) -> None:
    dataset = tmp_path / "products.jsonl"
    _write(
        dataset,
        [
            product_mapping(product_id="a", description="wireless headphones"),
            product_mapping(product_id="b", description="wireless headphones", company="Other"),
            product_mapping(
                product_id="c",
                description="kettle",
                company="Oak",
                category_slug="home",
                category_name="Home",
                active=False,
            ),
        ],
    )
    report = diagnose(dataset, relevance_path=None, top_k=5)
    assert report["production_quality_claim"] is False
    assert report["quality_metrics"] is None
    assert report["live_convex_ranker"] == "not_executed"
    python = report["python_content"]
    assert python["inactive_recommendation_count"] == 0
    assert python["self_recommendation_rate"] == 0.0
    assert python["duplicate_rate"] == 0.0


def test_diagnostics_can_score_labels_without_calling_them_production(tmp_path: Path) -> None:
    dataset = tmp_path / "products.jsonl"
    relevance = tmp_path / "relevance.jsonl"
    _write(
        dataset,
        [
            product_mapping(product_id="a", description="wireless headphones"),
            product_mapping(product_id="b", description="wireless headphones", company="Other"),
        ],
    )
    relevance.write_text(
        json.dumps({"product_id": "a", "relevant_product_ids": ["b"]}) + "\n",
        encoding="utf-8",
    )
    report = diagnose(dataset, relevance_path=relevance, top_k=1, production_labels=False)
    metrics = report["quality_metrics"]
    assert metrics is not None
    assert metrics["labels_are_production_evidence"] is False
    assert "precision_at_k" in metrics["python_content"]
    assert "ndcg_at_k" in metrics["python_content"]

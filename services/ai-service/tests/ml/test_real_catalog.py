import json
from pathlib import Path

import pytest

from app.ml.errors import TrainingError
from app.ml.inference.batch import recommendation_rows
from app.ml.inference.recommendations import RecommendationModel
from app.ml.preprocessing.products import dataset_fingerprint, order_for_training
from tests.ml.support import product_mapping
from training.train_recommendations import train


def _write_jsonl(path: Path, rows: list[dict[str, object]]) -> None:
    lines = [json.dumps(row) for row in rows]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _rows() -> tuple[dict[str, object], dict[str, object]]:
    first = product_mapping(
        product_id="b-product", name="Bookshelf Speaker", description="walnut speaker"
    )
    second = product_mapping(
        product_id="a-product",
        name="Travel Headphones",
        description="wireless headphones",
        active=False,
    )
    return first, second


def test_real_catalog_fingerprint_is_independent_of_file_order(tmp_path: Path) -> None:
    first, second = _rows()
    forward = tmp_path / "forward.jsonl"
    reverse = tmp_path / "reverse.jsonl"
    _write_jsonl(forward, [first, second])
    _write_jsonl(reverse, [second, first])
    from app.ml.preprocessing.products import load_product_jsonl

    forward_records = order_for_training(load_product_jsonl(forward).accepted, "real_catalog")
    reverse_records = order_for_training(load_product_jsonl(reverse).accepted, "real_catalog")
    assert dataset_fingerprint(forward_records) == dataset_fingerprint(reverse_records)
    assert [record.product_id for record in forward_records] == ["a-product", "b-product"]


def test_real_catalog_training_does_not_overwrite_content_v1(tmp_path: Path) -> None:
    dataset = tmp_path / "products.jsonl"
    _write_jsonl(dataset, list(_rows()))
    with pytest.raises(TrainingError, match="content-v1"):
        train(dataset, tmp_path / "content-v1", source="real_catalog")
    report = train(dataset, tmp_path / "runs", source="real_catalog")
    assert report["dataset_source"] == "real_catalog"
    assert str(report["artifact_version"]).startswith("content-v1-")
    assert Path(str(report["artifact_dir"])).name != "content-v1"
    with pytest.raises(TrainingError, match="overwrite"):
        train(dataset, tmp_path / "runs", source="real_catalog")


def test_batch_generation_skips_inactive_and_self(tmp_path: Path) -> None:
    dataset = tmp_path / "products.jsonl"
    active = product_mapping(product_id="keep-me", description="wireless headphones")
    other = product_mapping(
        product_id="also-keep",
        description="wireless headphones",
        company="Other",
    )
    inactive = product_mapping(
        product_id="hide-me", description="wireless headphones", active=False
    )
    _write_jsonl(dataset, [active, other, inactive])
    report = train(dataset, tmp_path / "model", source="synthetic")
    model = RecommendationModel.load(Path(str(report["artifact_dir"])), trusted=True)
    rows = recommendation_rows(model, top_k=5)
    ids = {row["product_id"] for row in rows}
    assert "hide-me" not in ids
    for row in rows:
        assert row["product_id"] not in row["recommended_product_ids"]
        assert "hide-me" not in row["recommended_product_ids"]
        assert len(set(row["recommended_product_ids"])) == len(row["recommended_product_ids"])

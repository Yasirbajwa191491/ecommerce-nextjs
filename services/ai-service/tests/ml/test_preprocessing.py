import json
from pathlib import Path

import pytest

from app.ml.errors import DatasetValidationError
from app.ml.preprocessing.features import build_text, price_band
from app.ml.preprocessing.products import (
    dataset_fingerprint,
    load_product_jsonl,
    validate_product_mappings,
)
from app.ml.preprocessing.text import normalize_text
from tests.ml.support import product_mapping, product_record
from training.sample_catalog import product_row_dicts, render_products_jsonl


def test_valid_row_normalizes_text_and_defaults_active() -> None:
    result = validate_product_mappings([product_mapping()])
    assert result.rejected == ()
    record = result.accepted[0]
    assert record.product_id == "sample-001"
    assert record.name == "travel headphones"
    assert record.company == "northwave"
    assert record.category_slug == "audio"
    assert record.active is True
    assert record.colors == ("black",)


def test_missing_optional_fields_do_not_become_the_words_none_or_nan() -> None:
    row = product_mapping()
    for field in ("description", "colors", "seo_keywords", "highlights", "currency", "sku"):
        row.pop(field, None)
    row["discount_percent"] = None
    record = validate_product_mappings([row]).accepted[0]
    assert record.description == ""
    assert record.colors == ()
    assert record.currency is None
    assert record.discount_percent is None
    text = build_text(record)
    assert "none" not in text.split()
    assert "nan" not in text.split()


def test_literal_word_none_is_preserved() -> None:
    assert normalize_text("None") == "none"
    assert normalize_text(None) == ""
    assert normalize_text(float("nan")) == ""


def test_empty_description_is_blank() -> None:
    record = product_record(description="   ")
    assert record.description == ""
    assert build_text(record)


def test_duplicate_product_id_keeps_the_first_row() -> None:
    first = product_mapping(description="Wireless headphones")
    second = product_mapping(description="Garden hose")
    result = validate_product_mappings([first, second])
    assert len(result.accepted) == 1
    assert result.accepted[0].description == "wireless headphones"
    assert result.rejected[0].reason == "duplicate_product_id"
    assert result.rejected[0].line_number == 2


def test_invalid_ids_and_prices_are_rejected() -> None:
    rows = [
        product_mapping(product_id=""),
        product_mapping(product_id="bad id"),
        product_mapping(product_id="-bad"),
        product_mapping(product_id="sample-price", price=-1),
        product_mapping(product_id="sample-name", name="  "),
        product_mapping(product_id="sample-colors", colors="black"),
    ]
    result = validate_product_mappings(rows)
    assert result.accepted == ()
    assert {row.reason for row in result.rejected} >= {
        "missing_product_id",
        "invalid_product_id",
        "invalid_price",
        "missing_name",
        "invalid_field_type",
    }


def test_empty_dataset() -> None:
    result = validate_product_mappings([])
    assert result.accepted == ()
    assert result.rejected == ()
    assert dataset_fingerprint(()) == dataset_fingerprint(())
    assert len(dataset_fingerprint(())) == 64


def test_unicode_normalization_is_deterministic() -> None:
    composed = normalize_text("Café kettle")
    decomposed = normalize_text("Cafe\u0301 kettle")
    upper = normalize_text("CAFÉ KETTLE")
    spaced = normalize_text("  café\u00a0kettle  ")
    assert composed == decomposed == upper == "café kettle"
    assert spaced == "café kettle"
    assert normalize_text("café kettle") == normalize_text("Café kettle")


def test_missing_active_means_eligible_like_the_store() -> None:
    row = product_mapping()
    row.pop("active", None)
    assert validate_product_mappings([row]).accepted[0].active is True
    inactive = validate_product_mappings([product_mapping(active=False)]).accepted[0]
    assert inactive.active is False


def test_unknown_fields_are_not_features() -> None:
    plain = product_mapping()
    extra = product_mapping(embedding=[0.1, 0.2], relevance_group="headphones")
    left = validate_product_mappings([plain]).accepted
    right = validate_product_mappings([extra]).accepted
    assert dataset_fingerprint(left) == dataset_fingerprint(right)
    assert "relevance_group" not in build_text(right[0])


def test_unreadable_jsonl_row_is_rejected(tmp_path: Path) -> None:
    path = tmp_path / "products.jsonl"
    path.write_text(json.dumps(product_mapping()) + "\n{this is not json\n", encoding="utf-8")
    result = load_product_jsonl(path)
    assert len(result.accepted) == 1
    assert result.rejected[0].reason == "unreadable_row"


def test_missing_file_raises(tmp_path: Path) -> None:
    with pytest.raises(DatasetValidationError):
        load_product_jsonl(tmp_path / "missing.jsonl")


def test_price_bands_are_half_open() -> None:
    assert price_band(0) == "under_25"
    assert price_band(24.99) == "under_25"
    assert price_band(25) == "25_to_75"
    assert price_band(74.99) == "25_to_75"
    assert price_band(75) == "75_to_200"
    assert price_band(500) == "500_and_above"


def test_synthetic_catalog_marks_invalid_rows_and_keeps_the_original_duplicate() -> None:
    result = validate_product_mappings(product_row_dicts())
    assert len(result.accepted) == 34
    assert result.reason_counts["duplicate_product_id"] == 1
    original = next(record for record in result.accepted if record.product_id == "sample-a-01")
    assert "headphones" in original.description
    assert "garden hose" not in original.description
    assert any(not record.active for record in result.accepted)
    assert "relevance_group" not in render_products_jsonl()

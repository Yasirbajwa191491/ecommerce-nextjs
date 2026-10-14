"""Load evaluation labels. Training does not import this module."""

import json
from pathlib import Path

from app.ml.errors import DatasetValidationError


def load_relevance_jsonl(path: Path) -> dict[str, set[str]]:
    if not path.is_file():
        raise DatasetValidationError(f"Relevance file not found: {path.name}")
    mapping: dict[str, set[str]] = {}
    try:
        text = path.read_text(encoding="utf-8-sig")
    except OSError as exc:
        raise DatasetValidationError("Relevance file could not be read") from exc
    for line_number, line in enumerate(text.splitlines(), start=1):
        if not line.strip():
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError as exc:
            raise DatasetValidationError(f"Relevance row {line_number} is not valid JSON") from exc
        if not isinstance(payload, dict):
            raise DatasetValidationError(f"Relevance row {line_number} must be an object")
        product_id = payload.get("product_id")
        relevant = payload.get("relevant_product_ids")
        if not isinstance(product_id, str) or not product_id.strip():
            raise DatasetValidationError(f"Relevance row {line_number} is missing product_id")
        if not isinstance(relevant, list) or not all(isinstance(item, str) for item in relevant):
            raise DatasetValidationError(
                f"Relevance row {line_number} is missing relevant_product_ids"
            )
        mapping[product_id.strip()] = {item for item in relevant if item != product_id.strip()}
    return mapping

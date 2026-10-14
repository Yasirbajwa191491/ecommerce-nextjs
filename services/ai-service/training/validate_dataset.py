"""Validate a product JSONL file against the dataset contract."""

import argparse
import json
import sys
from pathlib import Path

from app.ml.errors import DatasetValidationError, MachineLearningError
from app.ml.preprocessing.products import load_product_jsonl

SERVICE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = SERVICE_ROOT / "datasets" / "synthetic" / "products.jsonl"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate a product JSONL dataset.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit with status 1 when any row is rejected.",
    )
    args = parser.parse_args(argv)
    try:
        result = load_product_jsonl(args.dataset)
    except DatasetValidationError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    report = {
        "accepted": len(result.accepted),
        "rejected": len(result.rejected),
        "reason_counts": result.reason_counts,
        "rejections": [
            {
                "line_number": row.line_number,
                "product_id": row.product_id,
                "reason": row.reason,
            }
            for row in result.rejected
        ],
    }
    print(json.dumps(report, indent=2))
    if not result.accepted:
        print("error: dataset has no accepted products", file=sys.stderr)
        return 1
    if args.strict and result.rejected:
        return 1
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except MachineLearningError as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

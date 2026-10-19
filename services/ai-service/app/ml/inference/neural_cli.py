"""Sample item-to-item inference for a published neural artifact."""

import argparse
import json
import sys
from pathlib import Path

from app.ml.errors import MachineLearningError
from app.ml.inference.neural import recommend_neural_from_disk
from app.ml.neural.constants import NEURAL_MODEL_VERSION

SERVICE_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_NEURAL = SERVICE_ROOT / "artifacts" / "recommendations" / NEURAL_MODEL_VERSION


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run one neural recommendation.")
    parser.add_argument("--product-id", required=True)
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--neural-dir", type=Path, default=DEFAULT_NEURAL)
    args = parser.parse_args(argv)
    try:
        result = recommend_neural_from_disk(
            product_id=args.product_id,
            top_k=args.top_k,
            neural_dir=args.neural_dir,
        )
    except MachineLearningError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

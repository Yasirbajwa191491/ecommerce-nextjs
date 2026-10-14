"""Local inference CLI. This is not an HTTP endpoint."""

import argparse
import json
import sys
from pathlib import Path

from app.ml.constants import DEFAULT_TOP_K
from app.ml.errors import MachineLearningError
from app.ml.inference.recommendations import RecommendationModel

SERVICE_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_ARTIFACTS = SERVICE_ROOT / "artifacts" / "recommendations" / "content-v1"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Rank similar products with a locally trained content model.",
    )
    parser.add_argument("--product-id", required=True)
    parser.add_argument("--top-k", type=int, default=DEFAULT_TOP_K)
    parser.add_argument("--artifacts", type=Path, default=DEFAULT_ARTIFACTS)
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args(argv)
    try:
        model = RecommendationModel.load(args.artifacts, trusted=True)
        result = model.recommend(args.product_id, top_k=args.top_k)
    except MachineLearningError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    except Exception:
        if args.debug:
            raise
        print("error: recommendation failed", file=sys.stderr)
        return 1
    print(json.dumps(result.to_dict(), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Sample inference for a published behavioral artifact."""

import argparse
import json
import sys
from pathlib import Path

from app.ml.behavioral.constants import COLLABORATIVE_MODEL_VERSION, HYBRID_MODEL_VERSION
from app.ml.errors import MachineLearningError
from app.ml.inference.behavioral import recommend_from_disk

SERVICE_ROOT = Path(__file__).resolve().parents[3]
ARTIFACTS = SERVICE_ROOT / "artifacts" / "recommendations"
DEFAULT_CONTENT = ARTIFACTS / "content-v1"
DEFAULT_COLLABORATIVE = ARTIFACTS / COLLABORATIVE_MODEL_VERSION
DEFAULT_HYBRID = ARTIFACTS / HYBRID_MODEL_VERSION


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run one behavioral recommendation.")
    parser.add_argument("--product-id", required=True)
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument(
        "--strategy",
        choices=("content", "collaborative", "hybrid"),
        default="collaborative",
    )
    parser.add_argument("--content-dir", type=Path, default=DEFAULT_CONTENT)
    parser.add_argument("--collaborative-dir", type=Path, default=DEFAULT_COLLABORATIVE)
    parser.add_argument("--hybrid-dir", type=Path, default=DEFAULT_HYBRID)
    args = parser.parse_args(argv)
    content_dir = args.content_dir if (args.content_dir / "manifest.json").is_file() else None
    collaborative_dir = (
        args.collaborative_dir if (args.collaborative_dir / "manifest.json").is_file() else None
    )
    hybrid_dir = args.hybrid_dir if (args.hybrid_dir / "hybrid.json").is_file() else None
    try:
        result = recommend_from_disk(
            product_id=args.product_id,
            top_k=args.top_k,
            strategy=args.strategy,
            content_dir=content_dir,
            collaborative_dir=collaborative_dir,
            hybrid_dir=hybrid_dir,
        )
    except MachineLearningError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

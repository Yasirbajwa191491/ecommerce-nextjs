"""Write the hybrid ranking configuration. This does not fit a new matrix."""

import argparse
import json
import sys
from pathlib import Path

from app.ml.behavioral.constants import HYBRID_MODEL_VERSION
from app.ml.errors import MachineLearningError
from app.ml.models.behavioral_artifacts import save_hybrid_config
from app.ml.models.hybrid_recommender import HybridConfig

SERVICE_ROOT = Path(__file__).resolve().parents[1]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Publish hybrid recommendation weights.")
    parser.add_argument(
        "--output",
        type=Path,
        default=SERVICE_ROOT / "artifacts" / "recommendations" / HYBRID_MODEL_VERSION,
    )
    parser.add_argument("--content-weight", type=float, default=0.5)
    parser.add_argument("--collaborative-weight", type=float, default=0.5)
    parser.add_argument(
        "--fusion", choices=("reciprocal_rank", "minmax"), default="reciprocal_rank"
    )
    parser.add_argument("--rrf-k", type=int, default=60)
    parser.add_argument("--dataset-fingerprint", default="")
    args = parser.parse_args(argv)
    try:
        payload = save_hybrid_config(
            args.output,
            HybridConfig(
                content_weight=args.content_weight,
                collaborative_weight=args.collaborative_weight,
                fusion=args.fusion,
                rrf_k=args.rrf_k,
                dataset_fingerprint=args.dataset_fingerprint,
            ),
        )
    except MachineLearningError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

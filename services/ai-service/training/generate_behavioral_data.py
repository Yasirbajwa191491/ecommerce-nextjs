"""Write the deterministic synthetic behavioral dataset."""

import argparse
import json
import sys
from pathlib import Path

from app.ml.behavioral.synthetic import generate_behavioral_dataset
from app.ml.errors import MachineLearningError

SERVICE_ROOT = Path(__file__).resolve().parents[1]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate synthetic behavioral events.")
    parser.add_argument(
        "--output",
        type=Path,
        default=SERVICE_ROOT / "datasets" / "synthetic",
    )
    args = parser.parse_args(argv)
    try:
        manifest = generate_behavioral_dataset(args.output)
    except MachineLearningError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

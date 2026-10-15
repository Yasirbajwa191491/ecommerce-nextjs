"""Aggregate behavioral events into visitor-product weights."""

import argparse
import json
import sys
from pathlib import Path

from app.ml.behavioral.preprocess import aggregate_events, interaction_fingerprint
from app.ml.behavioral.schema import load_event_jsonl
from app.ml.behavioral.weights import weight_config
from app.ml.errors import MachineLearningError


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Aggregate implicit-feedback events.")
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--catalog", type=Path, default=None)
    parser.add_argument("--scheme", default="default")
    parser.add_argument("--half-life-days", type=float, default=None)
    args = parser.parse_args(argv)
    try:
        accepted, rejected = load_event_jsonl(args.dataset)
        catalog = _catalog(args.catalog) if args.catalog else None
        config = weight_config(args.scheme, half_life_days=args.half_life_days)
        interactions, report = aggregate_events(accepted, config, catalog_ids=catalog)
    except MachineLearningError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        json.dumps(item.to_dict(), sort_keys=True, separators=(",", ":")) for item in interactions
    ]
    args.output.write_text(
        "\n".join(lines) + ("\n" if lines else ""), encoding="utf-8", newline="\n"
    )
    print(
        json.dumps(
            {
                **report.to_dict(),
                "rejected_events": len(rejected),
                "dataset_fingerprint": interaction_fingerprint(interactions, config),
                "output": str(args.output),
            },
            indent=2,
        )
    )
    return 0 if interactions else 1


def _catalog(path: Path) -> set[str]:
    ids: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        payload = json.loads(line)
        product_id = payload.get("product_id")
        if isinstance(product_id, str):
            ids.add(product_id)
    return ids


if __name__ == "__main__":
    raise SystemExit(main())

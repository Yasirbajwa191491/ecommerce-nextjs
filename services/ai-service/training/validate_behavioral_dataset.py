"""Validate a behavioral JSONL file without training."""

import argparse
import json
import sys
from pathlib import Path

from app.ml.behavioral.schema import load_event_jsonl
from app.ml.errors import MachineLearningError


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate a behavioral event file.")
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args(argv)
    try:
        accepted, rejected = load_event_jsonl(args.dataset)
    except MachineLearningError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    report = {
        "accepted": len(accepted),
        "rejected": len(rejected),
        "reasons": rejected[:20],
        "synthetic": all(event.source == "synthetic" for event in accepted) if accepted else False,
    }
    print(json.dumps(report, indent=2))
    if not accepted or (args.strict and rejected):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

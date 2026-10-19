"""Local MLOps CLI. Training modules are named, not executed."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.core.config import get_settings
from app.mlops.drift import (
    jensen_shannon,
    missing_value_drift,
    population_stability_index,
)
from app.mlops.paths import configured_family_dir
from app.mlops.retraining import plan_job
from app.mlops.validation import validate_directory


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="mlops")
    sub = parser.add_subparsers(dest="command", required=True)

    validate = sub.add_parser("validate")
    validate.add_argument("--family", required=True)

    drift = sub.add_parser("drift")
    drift.add_argument("--metric", choices=("psi", "js", "missing"), required=True)
    drift.add_argument("--reference", required=True)
    drift.add_argument("--current", required=True)

    worker = sub.add_parser("worker")
    worker.add_argument("--job-type", required=True)
    worker.add_argument("--dataset", default="synthetic")
    worker.add_argument("--export-enabled", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "validate":
        settings = get_settings()
        directory = configured_family_dir(settings, args.family)
        if directory is None:
            print(json.dumps({"ok": False, "reasons": ["unsupported_family"]}))
            return 2
        report = validate_directory(args.family, directory)
        print(json.dumps(report.as_dict()))
        return 0 if report.ok else 1
    if args.command == "drift":
        reference = json.loads(Path(args.reference).read_text(encoding="utf-8"))
        current = json.loads(Path(args.current).read_text(encoding="utf-8"))
        if args.metric == "psi":
            result = population_stability_index(reference, current)
        elif args.metric == "js":
            result = jensen_shannon(reference, current)
        else:
            result = missing_value_drift(reference, current)
        print(
            json.dumps(
                {
                    "status": result.status,
                    "metric": result.metric,
                    "severity": result.severity,
                    "score": result.score,
                    "sample_size": result.sample_size,
                    "reason": result.reason,
                }
            )
        )
        return 0
    plan = plan_job(
        args.job_type,
        dataset_label=args.dataset,
        export_enabled=args.export_enabled,
        execute=False,
    )
    print(json.dumps(plan))
    return 0 if plan["state"] == "planned" else 1


if __name__ == "__main__":
    raise SystemExit(main())

"""Train the neural recommendation model and publish its artifact.

This command does not run when the API starts. It holds out the latest events
before fitting, then writes `neural-v1` without touching the other models.
"""

import argparse
import json
import sys
from pathlib import Path

from app.ml.behavioral.schema import load_event_jsonl
from app.ml.errors import MachineLearningError
from app.ml.models.neural_artifacts import save_neural_artifacts
from app.ml.neural.config import NeuralModelConfig
from app.ml.neural.constants import NEURAL_MODEL_VERSION
from app.ml.neural.pipeline import fit_neural_model, hold_out_future_events

SERVICE_ROOT = Path(__file__).resolve().parents[1]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Train the neural recommendation model.")
    parser.add_argument("--events", type=Path, required=True)
    parser.add_argument("--catalog", type=Path, default=None)
    parser.add_argument(
        "--output",
        type=Path,
        default=SERVICE_ROOT / "artifacts" / "recommendations" / NEURAL_MODEL_VERSION,
    )
    parser.add_argument("--source", choices=("synthetic", "convex_export"), default="synthetic")
    parser.add_argument("--scheme", default="default")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--embedding-dim", type=int, default=16)
    parser.add_argument("--hidden", default="32")
    parser.add_argument("--dropout", type=float, default=0.1)
    parser.add_argument("--learning-rate", type=float, default=0.05)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    parser.add_argument("--negative-ratio", type=int, default=4)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--patience", type=int, default=3)
    parser.add_argument("--device", choices=("cpu", "cuda", "auto"), default="cpu")
    parser.add_argument("--sampler", choices=("uniform", "popularity"), default="uniform")
    parser.add_argument("--outer-quantile", type=float, default=0.8)
    parser.add_argument("--validation-quantile", type=float, default=0.8)
    args = parser.parse_args(argv)
    try:
        report = train(
            events_path=args.events,
            catalog_path=args.catalog,
            output=args.output,
            source=args.source,
            config=NeuralModelConfig(
                embedding_dim=args.embedding_dim,
                hidden_sizes=_hidden(args.hidden),
                dropout=args.dropout,
                learning_rate=args.learning_rate,
                batch_size=args.batch_size,
                epochs=args.epochs,
                weight_decay=args.weight_decay,
                negative_ratio=args.negative_ratio,
                seed=args.seed,
                patience=args.patience,
                validation_quantile=args.validation_quantile,
                device=args.device,
                sampler=args.sampler,
                weight_scheme=args.scheme,
            ),
            outer_quantile=args.outer_quantile,
        )
    except MachineLearningError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


def train(
    *,
    events_path: Path,
    catalog_path: Path | None,
    output: Path,
    source: str,
    config: NeuralModelConfig,
    outer_quantile: float,
) -> dict[str, object]:
    accepted, _rejected = load_event_jsonl(events_path)
    catalog = (
        _catalog(catalog_path) if catalog_path else sorted({event.product_id for event in accepted})
    )
    split = hold_out_future_events(accepted, quantile=outer_quantile)
    recommender, report = fit_neural_model(
        split.train_events,
        catalog_ids=catalog,
        config=config,
        held_out_events=len(split.test_events),
        outer_cutoff=split.cutoff,
    )
    manifest = save_neural_artifacts(output, recommender, dataset_source=source, report=report)
    report["trained_at"] = manifest["trained_at"]
    report["artifact_dir"] = str(output)
    report["artifact_version"] = manifest["artifact_version"]
    (output / "training-report.md").write_text(_markdown(report), encoding="utf-8", newline="\n")
    return report


def _hidden(value: str) -> tuple[int, ...]:
    parts = [part.strip() for part in value.split(",") if part.strip()]
    try:
        return tuple(int(part) for part in parts)
    except ValueError as exc:
        raise MachineLearningError("Hidden layer sizes must be integers") from exc


def _catalog(path: Path) -> list[str]:
    ids: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        payload = json.loads(line)
        product_id = payload.get("product_id")
        if isinstance(product_id, str):
            ids.append(product_id)
    return sorted(set(ids))


def _markdown(report: dict[str, object]) -> str:
    lines = [
        "# Neural training report",
        "",
        "Item-to-item scores are embedding cosine similarity, not purchase probabilities.",
        "Unobserved pairs used as negatives are not confirmed dislikes.",
        "This report is not customer, conversion, or revenue performance.",
        "",
        f"Model version: {report.get('model_version')}",
        f"Dataset fingerprint: {report.get('dataset_fingerprint')}",
        f"Device: {report.get('device')}",
        f"Seed: {report.get('seed')}",
        f"PyTorch: {report.get('pytorch_version')}",
        f"Best validation loss: {report.get('best_validation_loss')}",
        f"Epochs ran: {report.get('epochs_ran')}",
        f"Best epoch: {report.get('best_epoch')}",
        f"Training seconds: {report.get('training_seconds')}",
        f"Held-out events excluded from training: {report.get('held_out_events')}",
        "",
    ]
    return "\n".join(lines)


if __name__ == "__main__":
    raise SystemExit(main())

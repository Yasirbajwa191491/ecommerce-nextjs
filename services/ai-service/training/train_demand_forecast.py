"""Train demand-forecast-v1 from a local dataset. This does not call Convex."""

import json
import sys
from pathlib import Path

from app.ml.forecasting.service import train_forecast_model


def main() -> None:
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "datasets/forecasting/synthetic.json")
    root = sys.argv[2] if len(sys.argv) > 2 else "./artifacts"
    if not source.is_file():
        print("Dataset file was not found", file=sys.stderr)
        sys.exit(2)
    payload = json.loads(source.read_text(encoding="utf-8"))
    metadata = train_forecast_model(payload, root)
    public = {
        key: metadata[key]
        for key in (
            "model_version",
            "dataset_label",
            "dataset_fingerprint",
            "trained_at",
            "data_cutoff",
            "statistically_weak",
            "fit_end",
            "select_end",
        )
        if key in metadata
    }
    public["model_version"] = "demand-forecast-v1"
    print(json.dumps(public))


if __name__ == "__main__":
    main()

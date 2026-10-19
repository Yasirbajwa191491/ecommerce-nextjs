"""Forecast one synthetic series with the trusted local artifact."""

import json
import sys

from app.ml.forecasting.service import build_frame, forecast_payload
from app.ml.forecasting.synthetic import generate_synthetic_lines


def main() -> None:
    entity = sys.argv[1] if len(sys.argv) > 1 else "p-stable"
    horizon = int(sys.argv[2] if len(sys.argv) > 2 else 14)
    payload = generate_synthetic_lines()
    frame = build_frame(payload)
    group = frame[(frame["entity_type"] == "product") & (frame["entity_id"] == entity)]
    if group.empty:
        print("Series was not found", file=sys.stderr)
        sys.exit(2)
    series = {
        "entity_type": "product",
        "entity_id": entity,
        "points": [
            {
                "date": row.date,
                "units": None if row.units != row.units else float(row.units),
                "observation": row.observation,
            }
            for row in group.itertuples(index=False)
        ],
    }
    result = forecast_payload(
        {"horizon_days": horizon, "strategy": "auto", "series": [series]},
        artifact_root="./artifacts",
    )
    first = result["forecasts"][0]
    print(
        json.dumps(
            {
                "entity_id": first["entity_id"],
                "model": first["model"],
                "confidence": first["confidence"],
                "dates": first["dates"][:3],
                "predicted_units": first["predicted_units"][:3],
                "dataset_label": result["dataset_label"],
            }
        )
    )


if __name__ == "__main__":
    main()

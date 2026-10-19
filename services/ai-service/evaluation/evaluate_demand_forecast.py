"""Compare forecast models on the synthetic dataset. Results are not store performance."""

import json

import numpy as np

from app.ml.forecasting.backtest import history_array, score_models
from app.ml.forecasting.service import build_frame
from app.ml.forecasting.synthetic import generate_synthetic_lines


def main() -> None:
    payload = generate_synthetic_lines()
    frame = build_frame(payload)
    store = frame[frame["entity_type"] == "store"]
    scores = score_models(history_array(store), horizon=7, step=7, min_train=28)
    ranked = sorted(
        (
            (name, item.get("mae"))
            for name, item in scores.items()
            if isinstance(item.get("mae"), float)
        ),
        key=lambda item: item[1],
    )
    print(
        json.dumps(
            {
                "label": "synthetic_not_store_performance",
                "entity": "store",
                "horizon_days": 7,
                "scores": scores,
                "lowest_mae": ranked[0][0] if ranked else None,
                "note": "MAPE is omitted because actual demand can be zero.",
                "finite_points": int(np.isfinite(history_array(store)).sum()),
            },
            default=str,
        )
    )


if __name__ == "__main__":
    main()

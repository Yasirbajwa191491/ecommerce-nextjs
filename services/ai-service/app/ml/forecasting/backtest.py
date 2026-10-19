"""Rolling-origin backtests. Origins move forward in time and never shuffle days."""

from __future__ import annotations

import numpy as np
import pandas as pd

from app.ml.forecasting.metrics import bias, mae, mase, rmse, wape
from app.ml.forecasting.models import (
    croston_forecast,
    exponential_smoothing_forecast,
    moving_average_forecast,
    naive_forecast,
    seasonal_naive_forecast,
)

STATISTICAL_MODELS = (
    "naive",
    "seasonal_naive",
    "moving_average",
    "exponential_smoothing",
    "intermittent",
)


def history_array(group: pd.DataFrame) -> np.ndarray:
    ordered = group.sort_values("date")
    values = pd.to_numeric(ordered["units"], errors="coerce").to_numpy(dtype=float)
    trainable = ordered["observation"].isin(["sale", "zero_filled"]).to_numpy()
    values = values.astype(float)
    values[~trainable] = np.nan
    return values


def origins(
    length: int, *, horizon: int, step: int, min_train: int, end: int | None = None
) -> list[int]:
    stop = length if end is None else min(length, end)
    cursor = min_train
    found: list[int] = []
    while cursor + horizon <= stop:
        found.append(cursor)
        cursor += step
    return found


def _predict(name: str, history: np.ndarray, horizon: int) -> np.ndarray:
    if name == "naive":
        return naive_forecast(history, horizon)
    if name == "seasonal_naive":
        return seasonal_naive_forecast(history, horizon)
    if name == "moving_average":
        return moving_average_forecast(history, horizon)
    if name == "exponential_smoothing":
        return exponential_smoothing_forecast(history, horizon)
    if name == "intermittent":
        return croston_forecast(history, horizon)
    raise ValueError(name)


def score_models(
    series: np.ndarray,
    *,
    horizon: int = 7,
    step: int = 7,
    min_train: int = 28,
    model_names: tuple[str, ...] = STATISTICAL_MODELS,
    origin_end: int | None = None,
) -> dict[str, dict[str, float | int | None]]:
    windows = origins(len(series), horizon=horizon, step=step, min_train=min_train, end=origin_end)
    scores: dict[str, dict[str, float | int | None]] = {}
    for name in model_names:
        actual_parts: list[np.ndarray] = []
        predicted_parts: list[np.ndarray] = []
        naive_scale: list[np.ndarray] = []
        for origin in windows:
            history = series[:origin]
            actual = series[origin : origin + horizon]
            predicted = _predict(name, history, horizon)
            mask = np.isfinite(actual)
            if not np.any(mask):
                continue
            actual_parts.append(actual[mask])
            predicted_parts.append(predicted[mask])
            seasonal = seasonal_naive_forecast(history, horizon)[mask]
            naive_scale.append(actual[mask] - seasonal)
        if not actual_parts:
            scores[name] = {
                "windows": 0,
                "mae": None,
                "rmse": None,
                "wape": None,
                "mase": None,
                "bias": None,
            }
            continue
        actual_all = np.concatenate(actual_parts)
        predicted_all = np.concatenate(predicted_parts)
        scores[name] = {
            "windows": len(actual_parts),
            "mae": mae(actual_all, predicted_all),
            "rmse": rmse(actual_all, predicted_all),
            "wape": wape(actual_all, predicted_all),
            "mase": mase(actual_all, predicted_all, np.concatenate(naive_scale)),
            "bias": bias(actual_all, predicted_all),
        }
    return scores

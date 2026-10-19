"""Closed-form and regression forecasts. Predictions are nonnegative unit demand."""

from __future__ import annotations

import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor

MODEL_NAMES = (
    "naive",
    "seasonal_naive",
    "moving_average",
    "exponential_smoothing",
    "ml_regression",
    "intermittent",
)


def _observed(history: np.ndarray) -> np.ndarray:
    values = np.asarray(history, dtype=float)
    return values[np.isfinite(values)]


def naive_forecast(history: np.ndarray, horizon: int) -> np.ndarray:
    observed = _observed(history)
    value = float(observed[-1]) if observed.size else 0.0
    return np.full(horizon, max(0.0, value), dtype=float)


def seasonal_naive_forecast(history: np.ndarray, horizon: int, season: int = 7) -> np.ndarray:
    extended = [float(value) if np.isfinite(value) else np.nan for value in history]
    output: list[float] = []
    for _ in range(horizon):
        index = len(extended) - season
        if index >= 0 and np.isfinite(extended[index]):
            value = max(0.0, float(extended[index]))
        else:
            value = float(naive_forecast(np.asarray(extended, dtype=float), 1)[0])
        output.append(value)
        extended.append(value)
    return np.asarray(output, dtype=float)


def moving_average_forecast(history: np.ndarray, horizon: int, window: int = 7) -> np.ndarray:
    observed = _observed(history)
    if observed.size == 0:
        return np.zeros(horizon, dtype=float)
    sample = observed[-max(1, window) :]
    value = max(0.0, float(np.mean(sample)))
    return np.full(horizon, value, dtype=float)


def exponential_smoothing_forecast(
    history: np.ndarray,
    horizon: int,
    alpha: float = 0.3,
) -> np.ndarray:
    observed = _observed(history)
    if observed.size == 0:
        return np.zeros(horizon, dtype=float)
    level = float(observed[0])
    for value in observed[1:]:
        level = alpha * float(value) + (1.0 - alpha) * level
    return np.full(horizon, max(0.0, level), dtype=float)


def croston_forecast(history: np.ndarray, horizon: int, alpha: float = 0.3) -> np.ndarray:
    """Croston's method on finite observations. NaN days are skipped, not treated as zero."""

    observed = _observed(history)
    if observed.size == 0:
        return np.zeros(horizon, dtype=float)
    sizes: list[float] = []
    intervals: list[int] = []
    gap = 0
    for value in observed:
        gap += 1
        if value > 0:
            sizes.append(float(value))
            intervals.append(gap)
            gap = 0
    if not sizes:
        return np.zeros(horizon, dtype=float)
    demand = sizes[0]
    interval = float(intervals[0])
    for size, step in zip(sizes[1:], intervals[1:], strict=True):
        demand = alpha * size + (1.0 - alpha) * demand
        interval = alpha * step + (1.0 - alpha) * interval
    rate = 0.0 if interval <= 0 else demand / interval
    return np.full(horizon, max(0.0, rate), dtype=float)


def forecast_named(
    name: str,
    history: np.ndarray,
    horizon: int,
    *,
    regressor: HistGradientBoostingRegressor | None = None,
    feature_row: np.ndarray | None = None,
) -> np.ndarray:
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
    if name == "ml_regression":
        if regressor is None or feature_row is None:
            return moving_average_forecast(history, horizon)
        value = max(0.0, float(regressor.predict(feature_row.reshape(1, -1))[0]))
        return np.full(horizon, value, dtype=float)
    raise ValueError(f"Unknown forecast model {name}")


def new_regressor() -> HistGradientBoostingRegressor:
    return HistGradientBoostingRegressor(
        max_iter=40,
        max_depth=4,
        learning_rate=0.08,
        min_samples_leaf=8,
        random_state=19,
    )

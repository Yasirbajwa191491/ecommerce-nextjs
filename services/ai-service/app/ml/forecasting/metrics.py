"""Forecast error metrics. MAPE is not used because actual demand can be zero."""

from __future__ import annotations

import math

import numpy as np


def _arrays(actual: np.ndarray, predicted: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    left = np.asarray(actual, dtype=float)
    right = np.asarray(predicted, dtype=float)
    if left.shape != right.shape:
        raise ValueError("Actual and predicted arrays must have the same shape")
    mask = np.isfinite(left) & np.isfinite(right)
    return left[mask], right[mask]


def mae(actual: np.ndarray, predicted: np.ndarray) -> float | None:
    left, right = _arrays(actual, predicted)
    if left.size == 0:
        return None
    return float(np.mean(np.abs(left - right)))


def rmse(actual: np.ndarray, predicted: np.ndarray) -> float | None:
    left, right = _arrays(actual, predicted)
    if left.size == 0:
        return None
    return float(math.sqrt(np.mean((left - right) ** 2)))


def wape(actual: np.ndarray, predicted: np.ndarray) -> float | None:
    left, right = _arrays(actual, predicted)
    denom = float(np.sum(np.abs(left)))
    if left.size == 0 or denom <= 0:
        return None
    return float(np.sum(np.abs(left - right)) / denom)


def mase(
    actual: np.ndarray,
    predicted: np.ndarray,
    seasonal_naive_errors: np.ndarray,
) -> float | None:
    point = mae(actual, predicted)
    scale_values = np.asarray(seasonal_naive_errors, dtype=float)
    scale_values = scale_values[np.isfinite(scale_values)]
    if point is None or scale_values.size == 0:
        return None
    scale = float(np.mean(np.abs(scale_values)))
    if scale <= 1e-9:
        return None
    return float(point / scale)


def bias(actual: np.ndarray, predicted: np.ndarray) -> float | None:
    left, right = _arrays(actual, predicted)
    if left.size == 0:
        return None
    return float(np.mean(right - left))


def coverage(
    actual: np.ndarray,
    lower: np.ndarray,
    upper: np.ndarray,
) -> float | None:
    left = np.asarray(actual, dtype=float)
    low = np.asarray(lower, dtype=float)
    high = np.asarray(upper, dtype=float)
    mask = np.isfinite(left) & np.isfinite(low) & np.isfinite(high)
    if not np.any(mask):
        return None
    inside = (left[mask] >= low[mask]) & (left[mask] <= high[mask])
    return float(np.mean(inside))

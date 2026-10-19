"""Empirical residual bands. These are not calibrated 95 percent intervals."""

from __future__ import annotations

import numpy as np

MIN_RESIDUALS = 8


def residual_band(residuals: np.ndarray) -> dict[str, float | str | None]:
    values = np.asarray(residuals, dtype=float)
    values = values[np.isfinite(values)]
    if values.size < MIN_RESIDUALS:
        return {
            "lower_offset": None,
            "upper_offset": None,
            "samples": int(values.size),
            "label": "unavailable",
        }
    low = float(np.quantile(values, 0.2))
    high = float(np.quantile(values, 0.8))
    return {
        "lower_offset": low,
        "upper_offset": high,
        "samples": int(values.size),
        "label": "empirical_residual_band",
    }


def apply_band(
    point: np.ndarray, band: dict[str, float | str | None]
) -> tuple[np.ndarray, np.ndarray]:
    predicted = np.maximum(0.0, np.asarray(point, dtype=float))
    low_offset = band.get("lower_offset")
    high_offset = band.get("upper_offset")
    if not isinstance(low_offset, float) or not isinstance(high_offset, float):
        return predicted.copy(), predicted.copy()
    lower = np.maximum(0.0, predicted + low_offset)
    upper = np.maximum(lower, predicted + high_offset)
    return lower, upper

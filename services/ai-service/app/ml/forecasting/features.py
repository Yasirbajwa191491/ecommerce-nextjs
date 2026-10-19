"""Lag and calendar features use earlier days only."""

from __future__ import annotations

import numpy as np
import pandas as pd

FEATURE_COLUMNS = [
    "day_of_week",
    "is_weekend",
    "month",
    "quarter",
    "day_of_month",
    "lag_1",
    "lag_7",
    "lag_14",
    "lag_28",
    "roll_mean_7",
    "roll_mean_14",
    "roll_mean_28",
    "roll_std_7",
    "growth_rate",
    "ma_change",
    "volatility",
    "product_age",
]


def add_features(frame: pd.DataFrame) -> pd.DataFrame:
    pieces: list[pd.DataFrame] = []
    for _, group in frame.groupby(["entity_type", "entity_id"], sort=False):
        pieces.append(_features_for_series(group.sort_values("date")))
    if not pieces:
        return frame
    return pd.concat(pieces, ignore_index=True)


def _features_for_series(group: pd.DataFrame) -> pd.DataFrame:
    out = group.copy()
    dates = pd.to_datetime(out["date"])
    trainable = out["observation"].isin(["sale", "zero_filled"])
    series = pd.to_numeric(out["units"], errors="coerce").where(trainable)
    past = series.shift(1)
    out["day_of_week"] = dates.dt.dayofweek.astype(float)
    out["is_weekend"] = (out["day_of_week"] >= 5).astype(float)
    out["month"] = dates.dt.month.astype(float)
    out["quarter"] = dates.dt.quarter.astype(float)
    out["day_of_month"] = dates.dt.day.astype(float)
    out["lag_1"] = past
    out["lag_7"] = series.shift(7)
    out["lag_14"] = series.shift(14)
    out["lag_28"] = series.shift(28)
    out["roll_mean_7"] = past.rolling(7, min_periods=1).mean()
    out["roll_mean_14"] = past.rolling(14, min_periods=1).mean()
    out["roll_mean_28"] = past.rolling(28, min_periods=1).mean()
    out["roll_std_7"] = past.rolling(7, min_periods=2).std()
    previous_mean = out["roll_mean_7"].shift(7)
    out["growth_rate"] = (out["roll_mean_7"] - previous_mean) / previous_mean.replace(0, np.nan)
    out["ma_change"] = out["roll_mean_7"] - out["roll_mean_14"]
    out["volatility"] = out["roll_std_7"]
    out["product_age"] = np.arange(len(out), dtype=float)
    return out


def feature_matrix(frame: pd.DataFrame) -> tuple[np.ndarray, np.ndarray, pd.DataFrame]:
    featured = frame if "lag_1" in frame.columns else add_features(frame)
    trainable = featured["observation"].isin(["sale", "zero_filled"])
    rows = featured.loc[trainable].copy()
    matrix = rows[FEATURE_COLUMNS].to_numpy(dtype=float)
    target = pd.to_numeric(rows["units"], errors="coerce").to_numpy(dtype=float)
    return matrix, target, rows

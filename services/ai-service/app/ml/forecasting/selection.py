"""Per-series model choice. A short history keeps a simple forecast."""

from __future__ import annotations

import numpy as np

from app.ml.forecasting.backtest import score_models

SIMPLE_MODELS = ("naive", "seasonal_naive", "moving_average", "exponential_smoothing")
IMPROVEMENT = 0.05
MIN_HISTORY = 14
MIN_SEASONAL = 21


def demand_pattern(history: np.ndarray) -> str:
    observed = history[np.isfinite(history)]
    if observed.size < MIN_HISTORY:
        return "cold_start"
    zeros = float(np.mean(observed <= 0))
    if zeros >= 0.5 and np.sum(observed > 0) >= 2:
        return "intermittent"
    if observed.size >= 28:
        early = float(np.mean(observed[:14]))
        late = float(np.mean(observed[-14:]))
        if early > 0 and abs(late - early) / early >= 0.25:
            return "trending"
    return "stable"


def _best(scores: dict[str, dict[str, float | int | None]], names: tuple[str, ...]) -> str | None:
    ranked = []
    for name in names:
        mae = scores.get(name, {}).get("mae")
        windows = scores.get(name, {}).get("windows")
        if isinstance(mae, float) and isinstance(windows, int) and windows > 0:
            ranked.append((mae, name))
    if not ranked:
        return None
    ranked.sort()
    return ranked[0][1]


def select_model(
    history: np.ndarray,
    *,
    strategy: str,
    horizon: int,
    ml_mae: float | None = None,
) -> dict[str, str | bool]:
    pattern = demand_pattern(history)
    observed = int(np.isfinite(history).sum())
    if strategy != "auto":
        if strategy == "ml_regression" and observed < 28:
            return {
                "model": "moving_average",
                "pattern": pattern,
                "confidence": "low",
                "fallback": "insufficient_history_for_ml",
                "statistically_weak": True,
            }
        if strategy == "seasonal_naive" and observed < MIN_SEASONAL:
            return {
                "model": "naive",
                "pattern": pattern,
                "confidence": "low",
                "fallback": "insufficient_history_for_seasonal_naive",
                "statistically_weak": True,
            }
        return {
            "model": strategy,
            "pattern": pattern,
            "confidence": "low" if observed < MIN_HISTORY else "medium",
            "fallback": "",
            "statistically_weak": observed < 45,
        }
    if observed < MIN_HISTORY:
        return {
            "model": "naive" if observed else "moving_average",
            "pattern": "cold_start",
            "confidence": "low",
            "fallback": "insufficient_history",
            "statistically_weak": True,
        }
    if pattern == "intermittent":
        scores = score_models(history, horizon=min(horizon, 7), min_train=max(14, observed // 3))
        chosen = _best(scores, ("intermittent", "naive")) or "intermittent"
        return {
            "model": chosen,
            "pattern": pattern,
            "confidence": "low",
            "fallback": "",
            "statistically_weak": observed < 45,
        }
    scores = score_models(
        history, horizon=min(horizon, 7), min_train=min(28, max(14, observed // 2))
    )
    simple = _best(scores, SIMPLE_MODELS) or "moving_average"
    simple_mae = scores.get(simple, {}).get("mae")
    chosen = simple
    if (
        isinstance(ml_mae, float)
        and isinstance(simple_mae, float)
        and simple_mae > 0
        and ml_mae < simple_mae * (1 - IMPROVEMENT)
    ):
        chosen = "ml_regression"
    return {
        "model": chosen,
        "pattern": pattern,
        "confidence": "medium" if observed >= 45 else "low",
        "fallback": "",
        "statistically_weak": observed < 45,
    }

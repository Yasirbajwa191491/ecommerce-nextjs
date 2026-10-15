"""Configurable implicit-feedback weights.

The default numbers are starting hyperparameters. Offline evaluation compares
them with uniform and purchase-heavy schemes. They are not conversion estimates.
"""

import math
from dataclasses import dataclass

from app.ml.behavioral.constants import DEFAULT_WEIGHTS, EVENT_TYPES, WEIGHT_SCHEMES
from app.ml.errors import DatasetValidationError


@dataclass(frozen=True)
class WeightConfig:
    weights: dict[str, float]
    half_life_days: float | None = None
    session_gap_seconds: int = 1800
    max_events_per_type: int = 20
    max_events_per_visitor: int = 500
    scheme: str = "default"

    def to_dict(self) -> dict[str, object]:
        return {
            "scheme": self.scheme,
            "weights": {key: self.weights[key] for key in sorted(self.weights)},
            "half_life_days": self.half_life_days,
            "session_gap_seconds": self.session_gap_seconds,
            "max_events_per_type": self.max_events_per_type,
            "max_events_per_visitor": self.max_events_per_visitor,
        }


def weight_config(
    scheme: str = "default",
    *,
    half_life_days: float | None = None,
    overrides: dict[str, float] | None = None,
) -> WeightConfig:
    if scheme not in WEIGHT_SCHEMES:
        raise DatasetValidationError("Unknown weighting scheme")
    weights = dict(WEIGHT_SCHEMES[scheme])
    if overrides:
        for key, value in overrides.items():
            if key not in EVENT_TYPES:
                raise DatasetValidationError("Unknown event weight")
            _require_weight(value)
            weights[key] = value
    for key in EVENT_TYPES:
        weights.setdefault(key, DEFAULT_WEIGHTS[key])
        _require_weight(weights[key])
    if half_life_days is not None and (not math.isfinite(half_life_days) or half_life_days <= 0):
        raise DatasetValidationError("Recency half-life must be a positive number of days")
    return WeightConfig(weights=weights, half_life_days=half_life_days, scheme=scheme)


def saturate(base_weight: float, decayed_sum: float) -> float:
    """Keep repeated cheap events below one strong event of a higher base weight.

    The first event contributes its base weight. Further repeats add a
    logarithmic increment of that same base, so twenty views stay below one
    purchase when the defaults are used.
    """

    if decayed_sum <= 0 or base_weight <= 0:
        return 0.0
    if decayed_sum <= base_weight:
        return decayed_sum
    extra_units = decayed_sum / base_weight
    return base_weight * (1.0 + math.log1p(extra_units - 1.0))


def _require_weight(value: float) -> None:
    if not math.isfinite(value) or value < 0:
        raise DatasetValidationError("Event weight must be a finite number that is at least 0")

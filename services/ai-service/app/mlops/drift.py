"""Statistical drift on bounded summaries. Raw customer records are not stored."""

from __future__ import annotations

import math
from collections import Counter
from dataclasses import dataclass
from typing import Literal

MIN_SAMPLES = 30
PSI_WARNING = 0.1
PSI_CRITICAL = 0.25
JS_WARNING = 0.05
JS_CRITICAL = 0.15
MISSING_WARNING = 0.05
MISSING_CRITICAL = 0.15

Severity = Literal["normal", "warning", "critical", "insufficient_data"]
AlertAction = Literal[
    "open",
    "duplicate",
    "cooldown",
    "awaiting_confirmation",
    "none",
    "resolve",
]


@dataclass(frozen=True)
class DriftResult:
    status: str
    metric: str
    severity: Severity
    score: float | None
    sample_size: int
    reason: str = ""


@dataclass(frozen=True)
class AlertDecision:
    action: AlertAction
    fingerprint: str
    severity: Severity


def _severity_from_thresholds(score: float, warning: float, critical: float) -> Severity:
    if score < warning:
        return "normal"
    if score < critical:
        return "warning"
    return "critical"


def _insufficient(metric: str, sample_size: int, reason: str) -> DriftResult:
    return DriftResult(
        status="insufficient_data",
        metric=metric,
        severity="insufficient_data",
        score=None,
        sample_size=sample_size,
        reason=reason,
    )


def population_stability_index(
    reference: list[float],
    current: list[float],
    *,
    bins: int = 10,
) -> DriftResult:
    sample_size = min(len(reference), len(current))
    if len(reference) < MIN_SAMPLES or len(current) < MIN_SAMPLES:
        return _insufficient("psi", sample_size, "min_sample")
    if _constant(reference) and _constant(current):
        if reference[0] == current[0]:
            return DriftResult("ok", "psi", "normal", 0.0, sample_size, "constant_feature")
        return DriftResult("ok", "psi", "critical", 1.0, sample_size, "constant_shift")
    edges = _quantile_edges(reference, bins)
    if len(edges) < 3:
        return DriftResult("ok", "psi", "normal", 0.0, sample_size, "constant_feature")
    expected = _digitize(reference, edges)
    actual = _digitize(current, edges)
    score = _psi(expected, actual)
    return DriftResult(
        status="ok",
        metric="psi",
        severity=_severity_from_thresholds(score, PSI_WARNING, PSI_CRITICAL),
        score=score,
        sample_size=sample_size,
    )


def jensen_shannon(
    reference: list[str],
    current: list[str],
) -> DriftResult:
    sample_size = min(len(reference), len(current))
    if len(reference) < MIN_SAMPLES or len(current) < MIN_SAMPLES:
        return _insufficient("jensen_shannon", sample_size, "min_sample")
    categories = sorted(set(reference) | set(current))
    if len(categories) <= 1 and reference[0] == current[0]:
        return DriftResult("ok", "jensen_shannon", "normal", 0.0, sample_size, "constant_feature")
    score = _js(_proportions(reference, categories), _proportions(current, categories))
    return DriftResult(
        status="ok",
        metric="jensen_shannon",
        severity=_severity_from_thresholds(score, JS_WARNING, JS_CRITICAL),
        score=score,
        sample_size=sample_size,
        reason="unseen_category" if set(current) - set(reference) else "",
    )


def missing_value_drift(reference: list[bool], current: list[bool]) -> DriftResult:
    sample_size = min(len(reference), len(current))
    if len(reference) < MIN_SAMPLES or len(current) < MIN_SAMPLES:
        return _insufficient("missing_rate", sample_size, "min_sample")
    if not reference or not current:
        return _insufficient("missing_rate", sample_size, "empty")
    delta = abs(_rate(current) - _rate(reference))
    return DriftResult(
        status="ok",
        metric="missing_rate",
        severity=_severity_from_thresholds(delta, MISSING_WARNING, MISSING_CRITICAL),
        score=delta,
        sample_size=sample_size,
    )


def performance_status(
    *,
    task: str,
    outcomes_available: bool,
    metric: str | None,
) -> dict[str, str]:
    """Refuse substitutes that are not outcome-backed performance."""

    blocked = {
        "shadow_overlap": "shadow_overlap_is_not_relevance",
        "synthetic": "synthetic_metrics_are_not_live_performance",
        "missing_actuals_as_zero": "missing_future_actuals_are_not_zero_error",
        "llm_confidence": "llm_confidence_is_not_correctness",
    }
    if metric in blocked:
        return {"status": "not_measured", "reason": blocked[metric]}
    if not outcomes_available:
        return {"status": "not_measured", "reason": f"{task}_outcomes_unavailable"}
    if metric is None:
        return {"status": "not_measured", "reason": "metric_missing"}
    return {"status": "measured", "reason": metric}


def alert_decision(
    *,
    family: str,
    feature: str,
    metric: str,
    severity: Severity,
    open_fingerprints: set[str],
    acknowledged_fingerprints: set[str],
    consecutive_hits: int,
    required_hits: int = 2,
) -> AlertDecision:
    fingerprint = f"{family}:{feature}:{metric}:{severity}"
    if severity in {"normal", "insufficient_data"}:
        return AlertDecision("resolve" if severity == "normal" else "none", fingerprint, severity)
    if consecutive_hits < required_hits:
        return AlertDecision("awaiting_confirmation", fingerprint, severity)
    if fingerprint in open_fingerprints:
        return AlertDecision("duplicate", fingerprint, severity)
    if fingerprint in acknowledged_fingerprints:
        return AlertDecision("cooldown", fingerprint, severity)
    return AlertDecision("open", fingerprint, severity)


def recommendation_reference(rows: list[dict[str, str]]) -> dict[str, object]:
    """Bounded summaries. Visitor identifiers are dropped."""

    types = [row.get("interaction_type", "unknown") for row in rows]
    categories = [row.get("category", "unknown") for row in rows]
    frequencies: list[float] = []
    counts = Counter(row.get("product_id", "") for row in rows if row.get("product_id"))
    frequencies.extend(float(value) for value in counts.values())
    return {
        "categorical": {"interaction_type": types, "category": categories},
        "numeric": {"product_frequency": frequencies},
        "excluded_fields": ["visitor_id", "email"],
    }


def forecast_reference(daily_units: list[float], zero_sales: list[bool]) -> dict[str, object]:
    return {
        "numeric": {"daily_units": daily_units},
        "missing": {"zero_sales": zero_sales},
    }


def rag_index_summary(
    *,
    source_types: list[str],
    empty_results: list[bool],
    citation_failures: list[bool],
) -> dict[str, str]:
    return {
        "kind": "retrieval_index",
        "numeric_feature_drift": "not_applicable",
        "source_types": str(len(set(source_types))),
        "empty_results": str(sum(empty_results)),
        "citation_failures": str(sum(citation_failures)),
    }


def _constant(values: list[float]) -> bool:
    return len(set(values)) <= 1


def _quantile_edges(values: list[float], bins: int) -> list[float]:
    ordered = sorted(values)
    last = len(ordered) - 1
    edges: list[float] = []
    for index in range(bins + 1):
        position = round(index / bins * last)
        edges.append(ordered[position])
    unique: list[float] = []
    for edge in edges:
        if not unique or edge > unique[-1]:
            unique.append(edge)
    return unique


def _digitize(values: list[float], edges: list[float]) -> list[int]:
    counts = [0] * (len(edges) - 1)
    for value in values:
        placed = len(counts) - 1
        for index in range(len(counts) - 1):
            if value < edges[index + 1]:
                placed = index
                break
        counts[placed] += 1
    return counts


def _psi(expected: list[int], actual: list[int]) -> float:
    expected_total = sum(expected) or 1
    actual_total = sum(actual) or 1
    score = 0.0
    for left, right in zip(expected, actual, strict=True):
        pe = max(left / expected_total, 1e-6)
        pa = max(right / actual_total, 1e-6)
        score += (pa - pe) * math.log(pa / pe)
    return score


def _proportions(values: list[str], categories: list[str]) -> list[float]:
    counts = Counter(values)
    total = len(values) or 1
    raw = [max(counts.get(category, 0) / total, 1e-6) for category in categories]
    scale = sum(raw)
    return [value / scale for value in raw]


def _js(left: list[float], right: list[float]) -> float:
    midpoint = [(a + b) / 2 for a, b in zip(left, right, strict=True)]
    return 0.5 * _kl(left, midpoint) + 0.5 * _kl(right, midpoint)


def _kl(source: list[float], target: list[float]) -> float:
    score = 0.0
    for left, right in zip(source, target, strict=True):
        score += left * math.log(left / right, 2)
    return score


def _rate(flags: list[bool]) -> float:
    if not flags:
        return 0.0
    return sum(1 for flag in flags if flag) / len(flags)

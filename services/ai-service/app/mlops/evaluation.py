"""Fair comparison and local-development quality gates.

These thresholds are starting points for local checks. They are not evidence
that a model is safe to serve in production.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

LOCAL_GATES = {
    "min_candidate_coverage": 0.2,
    "max_latency_ms": 2000.0,
    "max_ndcg_regression": 0.1,
    "min_ranking_samples": 20,
    "max_mae_relative_regression": 0.5,
    "max_abs_bias": 1.0,
    "min_backtest_samples": 8,
}


@dataclass
class EvaluationRecord:
    model_family: str
    model_version: str
    dataset_fingerprint: str
    dataset_type: str
    protocol: str
    sample_count: int
    metric_kind: str
    metrics: dict[str, float]
    horizon_or_k: int | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "model_family": self.model_family,
            "model_version": self.model_version,
            "dataset_fingerprint": self.dataset_fingerprint,
            "dataset_type": self.dataset_type,
            "protocol": self.protocol,
            "sample_count": self.sample_count,
            "metric_kind": self.metric_kind,
            "metrics": dict(self.metrics),
            "horizon_or_k": self.horizon_or_k,
        }


@dataclass
class Comparison:
    status: str
    reasons: list[str] = field(default_factory=list)
    deltas: dict[str, float] = field(default_factory=dict)


def compare_evaluations(left: EvaluationRecord, right: EvaluationRecord) -> Comparison:
    reasons: list[str] = []
    if left.metric_kind != right.metric_kind:
        reasons.append("metric_kind")
    if left.dataset_fingerprint != right.dataset_fingerprint:
        reasons.append("dataset_fingerprint")
    if left.protocol != right.protocol:
        reasons.append("protocol")
    if left.horizon_or_k != right.horizon_or_k:
        reasons.append("horizon_or_k")
    if left.dataset_type != right.dataset_type:
        reasons.append("dataset_type")
    if reasons:
        return Comparison(status="not_comparable", reasons=reasons)
    shared = sorted(set(left.metrics) & set(right.metrics))
    deltas = {name: right.metrics[name] - left.metrics[name] for name in shared}
    return Comparison(status="comparable", reasons=[], deltas=deltas)


def promotion_gate(
    candidate: EvaluationRecord,
    baseline: EvaluationRecord | None,
    *,
    accept_synthetic: bool,
    checksum_ok: bool,
    schema_ok: bool,
    smoke_ok: bool,
) -> dict[str, Any]:
    reasons: list[str] = []
    if not checksum_ok:
        reasons.append("checksum")
    if not schema_ok:
        reasons.append("feature_schema")
    if not smoke_ok:
        reasons.append("smoke_inference")
    if candidate.dataset_type == "synthetic" and not accept_synthetic:
        reasons.append("synthetic_evidence")
    if candidate.dataset_type == "synthetic" and accept_synthetic:
        reasons.append("synthetic_evidence_is_not_production_proof")
    if candidate.metric_kind == "ranking":
        coverage = candidate.metrics.get("candidate_coverage")
        latency = candidate.metrics.get("latency_ms")
        if candidate.sample_count < LOCAL_GATES["min_ranking_samples"]:
            reasons.append("sample_count")
        if coverage is None or coverage < LOCAL_GATES["min_candidate_coverage"]:
            reasons.append("candidate_coverage")
        if latency is None or latency > LOCAL_GATES["max_latency_ms"]:
            reasons.append("latency")
        if baseline is not None:
            compared = compare_evaluations(baseline, candidate)
            if compared.status != "comparable":
                reasons.append("not_comparable")
            else:
                drop = -compared.deltas.get("ndcg_at_k", 0.0)
                if drop > LOCAL_GATES["max_ndcg_regression"]:
                    reasons.append("ranking_regression")
    elif candidate.metric_kind == "forecast":
        if candidate.sample_count < LOCAL_GATES["min_backtest_samples"]:
            reasons.append("sample_count")
        bias = candidate.metrics.get("bias")
        if bias is None or abs(bias) > LOCAL_GATES["max_abs_bias"]:
            reasons.append("bias")
        if baseline is not None:
            compared = compare_evaluations(baseline, candidate)
            if compared.status != "comparable":
                reasons.append("not_comparable")
            else:
                base = baseline.metrics.get("mae")
                delta = compared.deltas.get("mae")
                relative = LOCAL_GATES["max_mae_relative_regression"]
                if base and delta is not None and base > 0 and delta / base > relative:
                    reasons.append("mae_regression")
    elif candidate.metric_kind == "retrieval":
        reasons.append("retrieval_index_is_not_a_trained_model")
    else:
        reasons.append("unsupported_metric_kind")
    blocking = [
        reason for reason in reasons if reason != "synthetic_evidence_is_not_production_proof"
    ]
    return {"ok": not blocking, "reasons": reasons}

import pytest

from app.mlops.evaluation import EvaluationRecord, compare_evaluations, promotion_gate
from app.mlops.monitoring import MonitoringStore
from app.mlops.retraining import (
    Job,
    JobQueue,
    RetrainingError,
    finish_evaluation,
    plan_job,
    transition,
)


def _ranking(version: str, ndcg: float, fingerprint: str = "same") -> EvaluationRecord:
    return EvaluationRecord(
        model_family="content",
        model_version=version,
        dataset_fingerprint=fingerprint,
        dataset_type="authorized_historical",
        protocol="leave_one_out",
        sample_count=40,
        metric_kind="ranking",
        metrics={"ndcg_at_k": ndcg, "candidate_coverage": 0.8, "latency_ms": 20},
        horizon_or_k=10,
    )


def test_comparable_versions_report_deltas() -> None:
    compared = compare_evaluations(_ranking("content-v1", 0.4), _ranking("content-v2", 0.5))
    assert compared.status == "comparable"
    assert compared.deltas["ndcg_at_k"] == pytest.approx(0.1)


def test_incompatible_comparisons() -> None:
    mae = EvaluationRecord(
        model_family="demand_forecast",
        model_version="demand-forecast-v1",
        dataset_fingerprint="sales",
        dataset_type="authorized_historical",
        protocol="backtest",
        sample_count=30,
        metric_kind="forecast",
        metrics={"mae": 1.0},
        horizon_or_k=14,
    )
    compared = compare_evaluations(_ranking("content-v1", 0.4), mae)
    assert compared.status == "not_comparable"
    assert "metric_kind" in compared.reasons
    different = compare_evaluations(
        _ranking("content-v1", 0.4, "one"),
        _ranking("content-v2", 0.4, "two"),
    )
    assert different.status == "not_comparable"


def test_quality_gate_blocks_synthetic_and_regression() -> None:
    synthetic = EvaluationRecord(
        model_family="neural",
        model_version="neural-v1",
        dataset_fingerprint="synth",
        dataset_type="synthetic",
        protocol="leave_one_out",
        sample_count=40,
        metric_kind="ranking",
        metrics={"ndcg_at_k": 0.5, "candidate_coverage": 0.9, "latency_ms": 10},
        horizon_or_k=10,
    )
    blocked = promotion_gate(
        synthetic, None, accept_synthetic=False, checksum_ok=True, schema_ok=True, smoke_ok=True
    )
    assert blocked["ok"] is False
    assert "synthetic_evidence" in blocked["reasons"]
    baseline = _ranking("content-v1", 0.6)
    candidate = _ranking("content-v2", 0.2)
    regressed = promotion_gate(
        candidate,
        baseline,
        accept_synthetic=False,
        checksum_ok=True,
        schema_ok=True,
        smoke_ok=True,
    )
    assert "ranking_regression" in regressed["reasons"]


def test_monitoring_counts_and_retention_ignore_sensitive_fields() -> None:
    store = MonitoringStore()
    store.record(
        family="content",
        model_version="content-v1",
        time_bucket="2026-01-01",
        outcome="success",
        latency_ms=12,
    )
    store.record(
        family="content",
        model_version="content-v1",
        time_bucket="2026-01-01",
        outcome="failure",
        latency_ms=30,
        error_category="timeout_upstream",
    )
    store.record(
        family="content",
        model_version="content-v1",
        time_bucket="2026-01-01",
        outcome="fallback",
        latency_ms=5,
    )
    bucket = store.buckets[("content", "content-v1", "2026-01-01")]
    assert bucket.success_count == 1
    assert bucket.failure_count == 1
    assert bucket.fallback_count == 1
    assert bucket.latency_max_ms == 30
    with pytest.raises(ValueError, match="sensitive_field"):
        store.record(
            family="content",
            model_version="content-v1",
            time_bucket="2026-01-02",
            outcome="success",
            latency_ms=1,
            extra={"email": "a@example.com"},
        )
    removed = store.prune(today="2026-04-01", retention_days=30)
    assert removed == 1


def test_retraining_allowlist_and_no_automatic_promotion() -> None:
    plan = plan_job("content_retrain", dataset_label="synthetic", export_enabled=False)
    assert plan["executed"] is False
    assert plan["state"] == "planned"
    with pytest.raises(RetrainingError, match="arbitrary_command"):
        plan_job(
            "content_retrain",
            dataset_label="synthetic",
            export_enabled=False,
            extra={"shell": "rm -rf"},
        )
    refused = plan_job(
        "forecast_retrain",
        dataset_label="authorized_aggregate",
        export_enabled=False,
    )
    assert refused["reason"] == "export_gate"
    visitor = plan_job(
        "collaborative_retrain",
        dataset_label="visitor_level",
        export_enabled=True,
    )
    assert visitor["reason"] == "visitor_export_forbidden"
    executed = plan_job(
        "neural_retrain", dataset_label="synthetic", export_enabled=False, execute=True
    )
    assert executed["reason"] == "automatic_execution_disabled"
    job = Job(job_id="job-1", job_type="content_retrain")
    transition(job, "authorized")
    transition(job, "preparing", worker="local-worker")
    transition(job, "training")
    transition(job, "evaluating")
    finish_evaluation(job, "content:content-v2:content-v2")
    assert job.state == "awaiting_approval"
    assert job.candidate_model_id.startswith("content:")
    with pytest.raises(RetrainingError):
        transition(job, "completed")


def test_duplicate_claim_and_queue() -> None:
    queue = JobQueue()
    queue.request("job-1", "hybrid_config_refresh", "configuration")
    with pytest.raises(RetrainingError, match="duplicate"):
        queue.request("job-1", "hybrid_config_refresh", "configuration")
    assert queue.claim("worker") is None
    transition(queue.jobs["job-1"], "authorized")
    claimed = queue.claim("worker-a")
    assert claimed is not None
    assert claimed.state == "preparing"
    assert queue.claim("worker-b") is None

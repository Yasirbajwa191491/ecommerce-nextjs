import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.mlops.cli import main
from tests.conftest import TEST_API_KEY, auth_header


def _settings(**overrides: object) -> Settings:
    return Settings(
        _env_file=None,
        app_env="test",
        ai_service_api_key=TEST_API_KEY,
        **overrides,
    )


def test_status_does_not_require_models(tmp_path: Path) -> None:
    settings = _settings(artifacts_dir=str(tmp_path))
    with TestClient(create_app(settings)) as client:
        denied = client.get("/api/v1/internal/mlops/status")
        allowed = client.get("/api/v1/internal/mlops/status", headers=auth_header(TEST_API_KEY))
    assert denied.status_code == 401
    body = allowed.json()
    assert body["monitoring_enabled"] is False
    assert body["customer_serving"] == "unchanged"
    assert body["artifact_availability"]["content"] == "missing"


def test_drift_and_monitoring_are_disabled_by_default() -> None:
    with TestClient(create_app(_settings())) as client:
        drift = client.post(
            "/api/v1/internal/mlops/drift",
            headers=auth_header(TEST_API_KEY),
            json={"metric": "psi", "reference": [1, 2], "current": [1, 2]},
        )
        monitor = client.post(
            "/api/v1/internal/mlops/monitoring",
            headers=auth_header(TEST_API_KEY),
            json={
                "family": "content",
                "model_version": "content-v1",
                "time_bucket": "2026-01-01",
                "outcome": "success",
                "latency_ms": 4,
            },
        )
        plan = client.post(
            "/api/v1/internal/mlops/retrain/plan",
            headers=auth_header(TEST_API_KEY),
            json={"job_type": "content_retrain", "dataset_label": "synthetic"},
        )
    assert drift.json()["status"] == "disabled"
    assert monitor.json()["status"] == "disabled"
    assert plan.json()["state"] == "disabled"


def test_monitoring_records_when_enabled() -> None:
    settings = _settings(mlops_monitoring_enabled=True, mlops_drift_detection_enabled=True)
    with TestClient(create_app(settings)) as client:
        recorded = client.post(
            "/api/v1/internal/mlops/monitoring",
            headers=auth_header(TEST_API_KEY),
            json={
                "family": "content",
                "model_version": "content-v1",
                "time_bucket": "2026-01-01",
                "outcome": "fallback",
                "latency_ms": 8,
            },
        )
        rejected = client.post(
            "/api/v1/internal/mlops/monitoring",
            headers=auth_header(TEST_API_KEY),
            json={
                "family": "content",
                "model_version": "content-v1",
                "time_bucket": "2026-01-01",
                "outcome": "success",
                "latency_ms": 8,
                "prompt": "secret",
            },
        )
    assert recorded.status_code == 200
    assert recorded.json()["bucket"]["fallback_count"] == 1
    assert rejected.status_code == 422


def test_cli_drift_and_worker(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    reference = tmp_path / "reference.json"
    current = tmp_path / "current.json"
    reference.write_text(json.dumps([1.0] * 10), encoding="utf-8")
    current.write_text(json.dumps([1.0] * 10), encoding="utf-8")
    assert (
        main(["drift", "--metric", "psi", "--reference", str(reference), "--current", str(current)])
        == 0
    )
    payload = json.loads(capsys.readouterr().out)
    assert payload["status"] == "insufficient_data"
    assert main(["worker", "--job-type", "content_retrain", "--dataset", "synthetic"]) == 0
    plan = json.loads(capsys.readouterr().out)
    assert plan["executed"] is False
    assert plan["entrypoint"] == "training.train_recommendations"

"""Authenticated forecast inference."""

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.ml.forecasting.service import train_forecast_model
from app.ml.forecasting.synthetic import generate_synthetic_lines
from tests.conftest import TEST_API_KEY, auth_header


def _client(tmp_path) -> TestClient:
    settings = Settings(
        _env_file=None,
        app_env="test",
        ai_service_api_key=TEST_API_KEY,
        artifacts_dir=str(tmp_path),
    )
    return TestClient(create_app(settings))


def _series() -> dict[str, object]:
    return {
        "entity_type": "product",
        "entity_id": "p-stable",
        "current_stock": 10,
        "points": [
            {"date": f"2026-01-{day:02d}", "units": 2, "observation": "sale"}
            for day in range(1, 21)
        ],
    }


def test_forecast_requires_auth_and_artifact(tmp_path) -> None:
    client = _client(tmp_path)
    body = {"horizon_days": 7, "strategy": "moving_average", "series": [_series()]}
    assert client.post("/api/v1/internal/forecast/demand", json=body).status_code == 401
    denied = client.post(
        "/api/v1/internal/forecast/demand",
        headers=auth_header("nope"),
        json=body,
    )
    assert denied.status_code == 401
    missing = client.post(
        "/api/v1/internal/forecast/demand",
        headers=auth_header(TEST_API_KEY),
        json=body,
    )
    assert missing.status_code == 409
    status = client.get("/api/v1/internal/forecast/status", headers=auth_header(TEST_API_KEY))
    assert status.status_code == 200
    assert status.json()["ready"] is False


def test_forecast_rejects_bad_horizon_path_and_batch(tmp_path) -> None:
    train_forecast_model(generate_synthetic_lines(), str(tmp_path))
    client = _client(tmp_path)
    headers = auth_header(TEST_API_KEY)
    bad_horizon = client.post(
        "/api/v1/internal/forecast/demand",
        headers=headers,
        json={"horizon_days": 60, "series": [_series()]},
    )
    assert bad_horizon.status_code == 400
    path = client.post(
        "/api/v1/internal/forecast/batch",
        headers=headers,
        json={"horizon_days": 7, "series": [_series()], "artifact_path": "/tmp/evil.joblib"},
    )
    assert path.status_code == 422
    too_many = client.post(
        "/api/v1/internal/forecast/batch",
        headers=headers,
        json={
            "horizon_days": 7,
            "series": [{**_series(), "entity_id": f"p{index}"} for index in range(21)],
        },
    )
    assert too_many.status_code == 422
    ok = client.post(
        "/api/v1/internal/forecast/demand",
        headers=headers,
        json={
            "horizon_days": 7,
            "strategy": "moving_average",
            "series": [_series()],
            "lead_time_days": 10,
        },
    )
    assert ok.status_code == 200
    body = ok.json()
    assert body["forecasts"][0]["model"] == "moving_average"
    assert all(value >= 0 for value in body["forecasts"][0]["predicted_units"])
    assert body["insights"][0]["reorder_quantity"] is not None
    assert body["dataset_label"] != "live_store_performance"

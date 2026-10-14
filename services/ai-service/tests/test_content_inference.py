import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from tests.conftest import TEST_API_KEY, auth_header
from tests.ml.support import product_mapping
from training.train_recommendations import train


def _dataset(path: Path) -> None:
    rows = [
        product_mapping(product_id="alpha", description="wireless headphones"),
        product_mapping(product_id="beta", description="wireless headphones", company="Other"),
    ]
    path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")


def _model_dir(tmp_path: Path) -> Path:
    dataset = tmp_path / "products.jsonl"
    _dataset(dataset)
    report = train(dataset, tmp_path / "model", source="synthetic")
    return Path(str(report["artifact_dir"]))


def test_inference_is_rejected_when_disabled(tmp_path: Path) -> None:
    settings = Settings(
        _env_file=None,
        app_env="test",
        ai_service_api_key=TEST_API_KEY,
        enable_model_inference=False,
        content_model_dir=str(_model_dir(tmp_path)),
    )
    with TestClient(create_app(settings)) as client:
        response = client.post(
            "/api/v1/recommendations/content",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "alpha", "top_k": 2},
        )
        ready = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json()["detail"] == "model_inference_disabled"
    assert ready.status_code == 200
    assert ready.json()["checks"]["model_inference"] == "disabled"


def test_enabled_inference_requires_auth_and_a_known_product(tmp_path: Path) -> None:
    settings = Settings(
        _env_file=None,
        app_env="test",
        ai_service_api_key=TEST_API_KEY,
        enable_model_inference=True,
        content_model_dir=str(_model_dir(tmp_path)),
    )
    with TestClient(create_app(settings)) as client:
        ready = client.get("/health/ready")
        anonymous = client.post(
            "/api/v1/recommendations/content",
            json={"product_id": "alpha", "top_k": 2},
        )
        missing = client.post(
            "/api/v1/recommendations/content",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "missing", "top_k": 2},
        )
        ranked = client.post(
            "/api/v1/recommendations/content",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "alpha", "top_k": 2},
        )
        batch = client.post(
            "/api/v1/recommendations/content/batch",
            headers=auth_header(TEST_API_KEY),
            json={"product_ids": ["alpha", "beta"], "top_k": 1},
        )
        too_many = client.post(
            "/api/v1/recommendations/content",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "alpha", "top_k": 101},
        )
    assert ready.status_code == 503
    assert ready.json()["checks"]["model_inference"] == "unavailable"
    assert anonymous.status_code == 401
    assert missing.status_code == 404
    assert missing.json()["detail"] == "unknown_product"
    assert ranked.status_code == 200
    body = ranked.json()
    assert body["model_version"] == "content-v1"
    assert body["recommendations"]
    assert all(item["product_id"] != "alpha" for item in body["recommendations"])
    assert "tmp_path" not in ranked.text
    assert batch.status_code == 200
    assert len(batch.json()["results"]) == 2
    assert too_many.status_code == 422

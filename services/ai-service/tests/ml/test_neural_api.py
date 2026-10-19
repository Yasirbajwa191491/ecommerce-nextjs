"""Authenticated neural strategy, including fallback and safe failures."""

import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.ml.models.neural_artifacts import save_neural_artifacts
from app.ml.neural.config import NeuralModelConfig
from app.ml.neural.pipeline import fit_neural_model
from tests.conftest import TEST_API_KEY, auth_header
from tests.ml.support import product_mapping
from tests.ml.test_neural_training import _events
from training.train_recommendations import train


def _neural(tmp_path: Path) -> Path:
    model, report = fit_neural_model(
        _events(),
        catalog_ids=["alpha", "beta", "gamma", "delta"],
        config=NeuralModelConfig(
            embedding_dim=4,
            hidden_sizes=(4,),
            dropout=0.0,
            epochs=2,
            patience=1,
            negative_ratio=1,
            batch_size=8,
            seed=7,
            device="cpu",
        ),
    )
    destination = tmp_path / "neural-v1"
    save_neural_artifacts(
        destination,
        model,
        dataset_source="synthetic",
        report=report,
        trained_at="2024-02-01T00:00:00+00:00",
    )
    return destination


def _content(tmp_path: Path) -> Path:
    dataset = tmp_path / "products.jsonl"
    rows = [
        product_mapping(product_id="delta", description="unused copper pan"),
        product_mapping(product_id="alpha", description="wireless headphones"),
    ]
    dataset.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
    report = train(dataset, tmp_path / "content", source="synthetic")
    return Path(str(report["artifact_dir"]))


def test_neural_inference_auth_and_cold_start_fallback(tmp_path: Path) -> None:
    settings = Settings(
        _env_file=None,
        app_env="test",
        ai_service_api_key=TEST_API_KEY,
        enable_model_inference=True,
        neural_model_dir=str(_neural(tmp_path)),
        content_model_dir=str(_content(tmp_path)),
    )
    with TestClient(create_app(settings)) as client:
        anonymous = client.post(
            "/api/v1/recommendations/behavioral",
            json={"product_id": "alpha", "top_k": 2, "strategy": "neural"},
        )
        invalid = client.post(
            "/api/v1/recommendations/behavioral",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "alpha", "top_k": 2, "strategy": "popularity"},
        )
        ranked = client.post(
            "/api/v1/recommendations/behavioral",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "alpha", "top_k": 2, "strategy": "neural"},
        )
        cold = client.post(
            "/api/v1/recommendations/behavioral",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "delta", "top_k": 1, "strategy": "neural"},
        )
        missing = client.post(
            "/api/v1/recommendations/behavioral",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "not-a-product", "top_k": 1, "strategy": "neural"},
        )
    assert anonymous.status_code == 401
    assert invalid.status_code == 422
    assert ranked.status_code == 200
    body = ranked.json()
    assert body["strategy"] == "neural"
    assert body["score_kind"] == "product_embedding_cosine"
    assert body["model_version"] == "neural-v1"
    assert "visitor" not in json.dumps(body)
    assert all(item["product_id"] != "alpha" for item in body["recommendations"])
    assert cold.status_code == 200
    assert cold.json()["strategy"] == "content"
    assert cold.json()["fallback_reason"] == "neural_cold_start"
    assert missing.status_code == 404
    assert missing.json()["detail"] == "unknown_product"


def test_disabled_and_missing_neural_model_are_safe(tmp_path: Path) -> None:
    disabled = Settings(
        _env_file=None,
        app_env="test",
        ai_service_api_key=TEST_API_KEY,
        enable_model_inference=False,
        neural_model_dir=str(tmp_path),
    )
    with TestClient(create_app(disabled)) as client:
        response = client.post(
            "/api/v1/recommendations/behavioral",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "alpha", "top_k": 1, "strategy": "neural"},
        )
    assert response.status_code == 503
    assert response.json()["detail"] == "model_inference_disabled"

    missing = Settings(
        _env_file=None,
        app_env="test",
        ai_service_api_key=TEST_API_KEY,
        enable_model_inference=True,
        neural_model_dir="",
    )
    with TestClient(create_app(missing)) as client:
        response = client.post(
            "/api/v1/recommendations/behavioral",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "alpha", "top_k": 1, "strategy": "neural"},
        )
    assert response.status_code == 503
    assert response.json()["detail"] == "model_unavailable"

"""Authenticated behavioral inference, artifacts, and safe failures."""

import json
import threading
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.ml.behavioral.preprocess import Interaction
from app.ml.behavioral.weights import weight_config
from app.ml.inference.behavioral import open_cached_collaborative_model
from app.ml.models.behavioral_artifacts import save_collaborative_artifacts
from app.ml.models.collaborative_recommender import CollaborativeRecommender
from tests.conftest import TEST_API_KEY, auth_header
from tests.ml.support import product_mapping
from training.train_recommendations import train


def _collaborative(tmp_path: Path) -> Path:
    model = CollaborativeRecommender()
    summary = model.fit(
        [
            Interaction("visitor-a", "alpha", 1.0, ("product_view",)),
            Interaction("visitor-a", "beta", 1.0, ("product_view",)),
            Interaction("visitor-b", "alpha", 1.0, ("add_to_cart",)),
            Interaction("visitor-b", "beta", 1.0, ("add_to_cart",)),
        ],
        dataset_fingerprint="abc",
        catalog_ids=["alpha", "beta"],
        min_product_interactions=1,
    )
    destination = tmp_path / "collaborative-v1"
    save_collaborative_artifacts(
        destination,
        model,
        summary,
        dataset_source="synthetic",
        weighting=weight_config().to_dict(),
        trained_at="2024-01-01T00:00:00+00:00",
    )
    return destination


def _content(tmp_path: Path) -> Path:
    dataset = tmp_path / "products.jsonl"
    rows = [
        product_mapping(product_id="alpha", description="wireless headphones"),
        product_mapping(product_id="beta", description="wireless headphones", company="Other"),
    ]
    dataset.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
    report = train(dataset, tmp_path / "content", source="synthetic")
    return Path(str(report["artifact_dir"]))


def test_behavioral_inference_auth_strategy_and_fallback(tmp_path: Path) -> None:
    content_dir = _content(tmp_path)
    collaborative_dir = _collaborative(tmp_path)
    settings = Settings(
        _env_file=None,
        app_env="test",
        ai_service_api_key=TEST_API_KEY,
        enable_model_inference=True,
        content_model_dir=str(content_dir),
        collaborative_model_dir=str(collaborative_dir),
    )
    with TestClient(create_app(settings)) as client:
        anonymous = client.post(
            "/api/v1/recommendations/behavioral",
            json={"product_id": "alpha", "top_k": 1, "strategy": "collaborative"},
        )
        invalid = client.post(
            "/api/v1/recommendations/behavioral",
            headers=auth_header("wrong-key"),
            json={"product_id": "alpha", "top_k": 1, "strategy": "collaborative"},
        )
        bad_strategy = client.post(
            "/api/v1/recommendations/behavioral",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "alpha", "top_k": 1, "strategy": "popularity"},
        )
        ranked = client.post(
            "/api/v1/recommendations/behavioral",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "alpha", "top_k": 1, "strategy": "collaborative"},
        )
        missing = client.post(
            "/api/v1/recommendations/behavioral",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "missing", "top_k": 1, "strategy": "collaborative"},
        )
        content = client.post(
            "/api/v1/recommendations/content",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "alpha", "top_k": 1},
        )
        hybrid = client.post(
            "/api/v1/recommendations/behavioral",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "alpha", "top_k": 1, "strategy": "hybrid"},
        )
    assert anonymous.status_code == 401
    assert invalid.status_code == 401
    assert bad_strategy.status_code == 422
    assert ranked.status_code == 200
    assert ranked.json()["strategy"] == "collaborative"
    assert ranked.json()["recommendations"][0]["model_version"] == "collaborative-v1"
    assert missing.status_code == 404
    assert content.status_code == 200
    assert "strategy" not in content.json()
    assert hybrid.status_code == 200
    assert hybrid.json()["requested_strategy"] == "hybrid"


def test_disabled_missing_corrupt_and_incompatible_artifacts(tmp_path: Path) -> None:
    collaborative_dir = _collaborative(tmp_path)
    disabled = Settings(
        _env_file=None,
        app_env="test",
        ai_service_api_key=TEST_API_KEY,
        enable_model_inference=False,
        collaborative_model_dir=str(collaborative_dir),
    )
    with TestClient(create_app(disabled)) as client:
        response = client.post(
            "/api/v1/recommendations/behavioral",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "alpha", "top_k": 1, "strategy": "collaborative"},
        )
    assert response.status_code == 503
    assert response.json()["detail"] == "model_inference_disabled"

    missing = Settings(
        _env_file=None,
        app_env="test",
        ai_service_api_key=TEST_API_KEY,
        enable_model_inference=True,
        collaborative_model_dir="",
    )
    with TestClient(create_app(missing)) as client:
        response = client.post(
            "/api/v1/recommendations/behavioral",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "alpha", "top_k": 1, "strategy": "collaborative"},
        )
    assert response.status_code == 503
    assert response.json()["detail"] == "model_unavailable"

    manifest_path = collaborative_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["files"]["model.joblib"]["sha256"] = "0" * 64
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    corrupt = Settings(
        _env_file=None,
        app_env="test",
        ai_service_api_key=TEST_API_KEY,
        enable_model_inference=True,
        collaborative_model_dir=str(collaborative_dir),
    )
    with TestClient(create_app(corrupt)) as client:
        response = client.post(
            "/api/v1/recommendations/behavioral",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "alpha", "top_k": 1, "strategy": "collaborative"},
        )
    assert response.status_code == 503

    fresh = _collaborative(tmp_path / "fresh")
    manifest = json.loads((fresh / "manifest.json").read_text(encoding="utf-8"))
    manifest["model_version"] = "content-v1"
    (fresh / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    incompatible = Settings(
        _env_file=None,
        app_env="test",
        ai_service_api_key=TEST_API_KEY,
        enable_model_inference=True,
        collaborative_model_dir=str(fresh),
    )
    with TestClient(create_app(incompatible)) as client:
        response = client.post(
            "/api/v1/recommendations/behavioral",
            headers=auth_header(TEST_API_KEY),
            json={"product_id": "alpha", "top_k": 1, "strategy": "collaborative"},
        )
    assert response.status_code == 503
    assert response.json()["detail"] == "invalid_model_version"


def test_concurrent_collaborative_loads_share_one_model(tmp_path: Path) -> None:
    directory = _collaborative(tmp_path)
    state = type("State", (), {})()
    loaded: list[int] = []

    def load() -> None:
        model = open_cached_collaborative_model(state, str(directory))
        loaded.append(id(model))

    threads = [threading.Thread(target=load) for _ in range(8)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert len(set(loaded)) == 1

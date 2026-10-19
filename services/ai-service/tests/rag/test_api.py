import json

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from tests.conftest import TEST_API_KEY, auth_header


def _client(tmp_path) -> TestClient:
    settings = Settings(
        _env_file=None,
        app_env="test",
        ai_service_api_key=TEST_API_KEY,
        artifacts_dir=str(tmp_path),
    )
    return TestClient(create_app(settings))


def test_rag_requires_auth(tmp_path) -> None:
    client = _client(tmp_path)
    response = client.post("/api/v1/internal/rag/retrieve", json={"query": "headphones"})
    assert response.status_code == 401
    denied = client.post(
        "/api/v1/internal/rag/retrieve",
        headers=auth_header("wrong-token"),
        json={"query": "headphones"},
    )
    assert denied.status_code == 401
    assert "wrong-token" not in denied.text


def test_invalid_input_and_missing_index(tmp_path) -> None:
    client = _client(tmp_path)
    headers = auth_header(TEST_API_KEY)
    invalid = client.post("/api/v1/internal/rag/retrieve", headers=headers, json={"query": ""})
    assert invalid.status_code == 422
    limited = client.post(
        "/api/v1/internal/rag/retrieve",
        headers=headers,
        json={"query": "headphones", "top_k": 50},
    )
    assert limited.status_code == 422
    missing = client.post(
        "/api/v1/internal/rag/retrieve",
        headers=headers,
        json={"query": "wireless headphones"},
    )
    assert missing.status_code == 409
    assert missing.json()["detail"] == "Retrieval index is not available"
    traversal = client.post(
        "/api/v1/internal/rag/evaluate",
        headers=headers,
        json={"dataset": "synthetic", "path": "../.env"},
    )
    assert traversal.status_code == 422


def test_index_retrieve_and_evaluate(tmp_path) -> None:
    client = _client(tmp_path)
    headers = auth_header(TEST_API_KEY)
    from app.rag.dataset import load_synthetic_dataset

    indexed = client.post(
        "/api/v1/internal/rag/index",
        headers=headers,
        json=load_synthetic_dataset()["index"],
    )
    assert indexed.status_code == 200
    body = indexed.json()
    assert body["indexed"] > 0
    assert "p-chair" not in json.dumps(body)
    repeated = client.post(
        "/api/v1/internal/rag/index",
        headers=headers,
        json=load_synthetic_dataset()["index"],
    )
    assert repeated.status_code == 200
    assert repeated.json()["skipped"] > 0
    found = client.post(
        "/api/v1/internal/rag/retrieve",
        headers=headers,
        json={"query": "What is the return policy?", "strategy": "hybrid", "top_k": 3},
    )
    assert found.status_code == 200
    payload = found.json()
    assert payload["empty"] is False
    assert payload["citations"][0]["url"] == "/return"
    assert payload["prompt"]["system"]
    assert "Ignore previous instructions" not in payload["prompt"]["system"]
    assert "latency_ms" in payload
    report = client.post("/api/v1/internal/rag/evaluate", headers=headers, json={})
    assert report.status_code == 200
    assert report.json()["dataset"] == "synthetic"
    assert "retrieval" in report.json()

import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def test_convex_prepare_contract_builds_a_fresh_synthetic_index(tmp_path):
    # Shared contract fixture is also asserted against the TypeScript caller.
    fixture = Path(__file__).resolve().parents[4] / "tests/contracts/rag-prepare.json"
    body = json.loads(fixture.read_text())
    settings = Settings(
        _env_file=None,
        app_env="test",
        ai_service_api_key="synthetic-contract-fixture-key",
        artifacts_dir=str(tmp_path),
    )
    headers = {"Authorization": "Bearer synthetic-contract-fixture-key"}
    with TestClient(create_app(settings)) as client:
        prepared = client.post("/api/v1/internal/rag/prepare", json=body, headers=headers)
        assert prepared.status_code == 200
        assert prepared.json()["chunks"]
        indexed = client.post(
            "/api/v1/internal/rag/index",
            json={**body, "embedding_mode": "hashing"},
            headers=headers,
        )
        assert indexed.status_code == 200
        response = client.post(
            "/api/v1/internal/rag/retrieve",
            json={"query": "standard delivery", "strategy": "keyword"},
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["documents"]
        assert (
            client.post(
                "/api/v1/internal/rag/prepare",
                json={**body, "embedding_mode": "provided"},
                headers=headers,
            ).status_code
            == 422
        )

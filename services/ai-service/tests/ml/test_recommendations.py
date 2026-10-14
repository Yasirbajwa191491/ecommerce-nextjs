import json
import subprocess
import sys
from pathlib import Path

import pytest
from sklearn.metrics.pairwise import cosine_similarity

from app.ml.constants import MODEL_VERSION
from app.ml.errors import TrainingError, UnknownProductError
from app.ml.inference.cli import main as inference_main
from app.ml.inference.recommendations import RecommendationModel
from app.ml.models.artifacts import save_artifacts
from app.ml.models.content_recommender import ContentRecommender
from tests.ml.support import product_record
from training.sample_catalog import render_products_jsonl
from training.train_recommendations import main as train_main

SERVICE_ROOT = Path(__file__).resolve().parents[2]


def _fitted() -> ContentRecommender:
    model = ContentRecommender()
    model.fit(
        (
            product_record(
                "alpha",
                description="Wireless noise cancelling headphones for travel",
            ),
            product_record(
                "beta",
                name="Flight Headphones",
                description="Bluetooth noise cancelling headphones",
                company="Lumen Labs",
            ),
            product_record(
                "gamma",
                name="Bookshelf Speakers",
                description="Passive walnut bookshelf speakers",
                company="Birchline",
            ),
            product_record("delta", company="QuietPeak", active=False),
        )
    )
    return model


def test_known_product_excludes_itself_and_inactive_rows() -> None:
    result = _fitted().recommend("alpha", top_k=5)
    ids = [item.product_id for item in result.recommendations]
    assert "alpha" not in ids
    assert "delta" not in ids
    assert ids[0] == "beta"
    assert result.model_version == MODEL_VERSION
    assert all(item.model_version == MODEL_VERSION for item in result.recommendations)
    assert all(0.0 <= item.score <= 1.0 for item in result.recommendations)
    assert [item.rank for item in result.recommendations] == list(
        range(1, len(result.recommendations) + 1)
    )


def test_scores_match_cosine_similarity() -> None:
    model = _fitted()
    result = model.recommend("alpha", top_k=1)
    neighbor = result.recommendations[0]
    query_index = model._index["alpha"]
    neighbor_index = model._index[neighbor.product_id]
    raw = float(cosine_similarity(model.matrix[query_index], model.matrix[neighbor_index])[0, 0])
    assert neighbor.score == pytest.approx(round(min(1.0, max(0.0, raw)), 6))


def test_unknown_product_has_a_clear_error() -> None:
    model = _fitted()
    with pytest.raises(UnknownProductError, match="missing-id"):
        model.recommend("missing-id")


def test_top_k_limits_and_validation() -> None:
    model = _fitted()
    assert len(model.recommend("alpha", top_k=1).recommendations) == 1
    assert len(model.recommend("alpha", top_k=50).recommendations) == 2
    with pytest.raises(TrainingError):
        model.recommend("alpha", top_k=0)
    with pytest.raises(TrainingError):
        model.recommend("alpha", top_k=True)


def test_ranking_is_stable_and_ties_break_on_product_id() -> None:
    model = ContentRecommender()
    model.fit(
        (
            product_record("query"),
            product_record("m-2", company="Same Co"),
            product_record("m-1", company="Same Co"),
        )
    )
    first = model.recommend("query", top_k=5)
    second = model.recommend("query", top_k=5)
    assert first == second
    assert [item.product_id for item in first.recommendations] == ["m-1", "m-2"]
    assert first.recommendations[0].score == first.recommendations[1].score


def test_no_eligible_candidates_returns_an_empty_list() -> None:
    model = ContentRecommender()
    model.fit((product_record("only"), product_record("hidden", active=False, company="Other")))
    assert model.recommend("only", top_k=5).recommendations == ()


def test_cli_unknown_product_does_not_print_a_traceback(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    model = ContentRecommender()
    summary = model.fit((product_record("alpha"), product_record("beta", company="Lumen Labs")))
    artifact_dir = tmp_path / "content-v1"
    save_artifacts(artifact_dir, model, summary)
    code = inference_main(
        ["--product-id", "missing", "--artifacts", str(artifact_dir), "--top-k", "3"]
    )
    captured = capsys.readouterr()
    assert code == 1
    assert "Traceback" not in captured.err
    assert "Unknown product id: missing" in captured.err


def test_fresh_process_loads_scores(tmp_path: Path) -> None:
    dataset = tmp_path / "products.jsonl"
    dataset.write_text(render_products_jsonl(), encoding="utf-8", newline="\n")
    artifacts = tmp_path / "content-v1"
    assert train_main(["--dataset", str(dataset), "--output", str(artifacts)]) == 0
    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "app.ml.inference.cli",
            "--product-id",
            "sample-a-01",
            "--top-k",
            "5",
            "--artifacts",
            str(artifacts),
        ],
        cwd=SERVICE_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr
    payload = json.loads(completed.stdout)
    assert payload["model_version"] == MODEL_VERSION
    ids = [item["product_id"] for item in payload["recommendations"]]
    assert "sample-a-01" not in ids
    assert "sample-a-07" not in ids
    assert ids[0] in {"sample-a-08", "sample-a-09"}
    assert all(0.0 <= item["score"] <= 1.0 for item in payload["recommendations"])
    reloaded = RecommendationModel.load(artifacts, trusted=True)
    reloaded_ids = [
        item.product_id for item in reloaded.recommend("sample-a-01", top_k=5).recommendations
    ]
    assert reloaded_ids == ids

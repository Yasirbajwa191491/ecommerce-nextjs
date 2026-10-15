"""Hybrid fusion of the content model and the collaborative model."""

import pytest

from app.ml.errors import ModelUnavailableError, TrainingError, UnknownProductError
from app.ml.models.content_recommender import Recommendation, RecommendationResult
from app.ml.models.hybrid_recommender import HybridConfig, HybridRecommender


class _Ranker:
    def __init__(self, mapping: dict[str, list[tuple[str, float]]], version: str) -> None:
        self.model_version = version
        self.mapping = mapping

    def recommend(self, product_id: str, top_k: int = 5) -> RecommendationResult:
        if product_id not in self.mapping:
            raise UnknownProductError(product_id)
        chosen = self.mapping[product_id][:top_k]
        return RecommendationResult(
            query_product_id=product_id,
            model_name=self.model_version,
            model_version=self.model_version,
            recommendations=tuple(
                Recommendation(
                    product_id=item_id,
                    score=score,
                    rank=rank,
                    model_version=self.model_version,
                )
                for rank, (item_id, score) in enumerate(chosen, start=1)
            ),
        )


def _hybrid() -> HybridRecommender:
    content = _Ranker(
        {"anchor": [("alpha", 0.9), ("beta", 0.2)], "cold": [("alpha", 0.4)]}, "content-v1"
    )
    collaborative = _Ranker(
        {"anchor": [("beta", 0.8), ("gamma", 0.7)], "lonely": []}, "collaborative-v1"
    )
    return HybridRecommender(
        content=content,
        collaborative=collaborative,
        config=HybridConfig(
            content_weight=1, collaborative_weight=1, fusion="reciprocal_rank", rrf_k=60
        ),
    )


def test_strategy_modes_and_deterministic_blend() -> None:
    model = _hybrid()
    content = model.recommend("anchor", 2, strategy="content")
    collaborative = model.recommend("anchor", 2, strategy="collaborative")
    hybrid = model.recommend("anchor", 3, strategy="hybrid")
    assert content.strategy == "content"
    assert content.model_version == "content-v1"
    assert [item.product_id for item in content.recommendations] == ["alpha", "beta"]
    assert collaborative.strategy == "collaborative"
    assert collaborative.model_version == "collaborative-v1"
    assert hybrid.strategy == "hybrid"
    assert hybrid.model_version == "hybrid-v1"
    assert hybrid.fallback_reason is None
    ids = [item.product_id for item in hybrid.recommendations]
    assert ids == sorted(ids, key=lambda item: (-_score(hybrid, item), item))
    assert len(ids) == len(set(ids))
    assert "anchor" not in ids
    again = model.recommend("anchor", 3, strategy="hybrid")
    assert [item.to_dict() for item in hybrid.recommendations] == [
        item.to_dict() for item in again.recommendations
    ]


def test_fallbacks_and_weight_validation() -> None:
    content = _Ranker({"anchor": [("alpha", 0.5)], "cold": [("alpha", 0.4)]}, "content-v1")
    missing = HybridRecommender(content=content, collaborative=None, config=HybridConfig())
    fallback = missing.recommend("anchor", 2, strategy="hybrid")
    assert fallback.strategy == "content"
    assert fallback.fallback_reason == "collaborative_model_unavailable"
    cold = _hybrid().recommend("cold", 2, strategy="hybrid")
    assert cold.strategy == "content"
    assert cold.fallback_reason == "unknown_to_collaborative_model"
    empty = _Ranker({"lonely": []}, "collaborative-v1")
    hybrid = HybridRecommender(
        content=_Ranker({"lonely": [("alpha", 0.2)]}, "content-v1"),
        collaborative=empty,
        config=HybridConfig(),
    )
    cold_start = hybrid.recommend("lonely", 2, strategy="hybrid")
    assert cold_start.strategy == "content"
    assert cold_start.fallback_reason == "insufficient_collaborative_evidence"
    with pytest.raises(ModelUnavailableError):
        HybridRecommender(content=None, collaborative=None).recommend(
            "anchor", 1, strategy="collaborative"
        )
    with pytest.raises(TrainingError):
        HybridRecommender(
            content=content, collaborative=empty, config=HybridConfig(content_weight=-1)
        )
    with pytest.raises(UnknownProductError):
        _hybrid().recommend("missing", 1, strategy="hybrid")


def _score(result, product_id: str) -> float:
    for item in result.recommendations:
        if item.product_id == product_id:
            return item.score
    return 0.0

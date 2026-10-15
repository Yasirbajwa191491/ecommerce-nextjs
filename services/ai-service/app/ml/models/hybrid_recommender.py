"""Hybrid ranking for the content model and the collaborative model.

Component scores are not treated as the same unit. The default fusion is
reciprocal rank, which uses rank position instead of the raw cosine values.
`minmax` rescales each list onto [0, 1] before the weighted sum.
"""

import math
from dataclasses import dataclass
from typing import Protocol

from app.ml.behavioral.constants import (
    FUSION_MODES,
    HYBRID_MODEL_NAME,
    HYBRID_MODEL_VERSION,
    STRATEGIES,
)
from app.ml.constants import MAX_TOP_K, SCORE_DECIMALS
from app.ml.errors import ModelUnavailableError, TrainingError, UnknownProductError
from app.ml.models.content_recommender import RecommendationResult


class Ranker(Protocol):
    model_version: str

    def recommend(self, product_id: str, top_k: int = 5) -> RecommendationResult:
        """Return ranked products for one known catalog id."""


@dataclass(frozen=True)
class HybridConfig:
    content_weight: float = 0.5
    collaborative_weight: float = 0.5
    fusion: str = "reciprocal_rank"
    rrf_k: int = 60
    content_model_version: str = "content-v1"
    collaborative_model_version: str = "collaborative-v1"
    dataset_fingerprint: str = ""

    def to_dict(self) -> dict[str, object]:
        return {
            "model_name": HYBRID_MODEL_NAME,
            "model_version": HYBRID_MODEL_VERSION,
            "content_weight": self.content_weight,
            "collaborative_weight": self.collaborative_weight,
            "fusion": self.fusion,
            "rrf_k": self.rrf_k,
            "content_model_version": self.content_model_version,
            "collaborative_model_version": self.collaborative_model_version,
            "dataset_fingerprint": self.dataset_fingerprint,
        }


@dataclass(frozen=True)
class HybridRecommendation:
    product_id: str
    score: float
    rank: int
    model_version: str
    strategy: str

    def to_dict(self) -> dict[str, object]:
        return {
            "product_id": self.product_id,
            "score": self.score,
            "rank": self.rank,
            "model_version": self.model_version,
            "strategy": self.strategy,
        }


@dataclass(frozen=True)
class HybridRecommendationResult:
    query_product_id: str
    requested_strategy: str
    strategy: str
    model_version: str
    fallback_reason: str | None
    recommendations: tuple[HybridRecommendation, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "product_id": self.query_product_id,
            "requested_strategy": self.requested_strategy,
            "strategy": self.strategy,
            "model_version": self.model_version,
            "fallback_reason": self.fallback_reason,
            "recommendations": [item.to_dict() for item in self.recommendations],
        }


class HybridRecommender:
    """Blend content and collaborative neighbors without replacing either model."""

    def __init__(
        self,
        *,
        content: Ranker | None,
        collaborative: Ranker | None,
        config: HybridConfig | None = None,
    ) -> None:
        self.content = content
        self.collaborative = collaborative
        self.config = _validated_config(config or HybridConfig())
        self.model_name = HYBRID_MODEL_NAME
        self.model_version = HYBRID_MODEL_VERSION

    def recommend(
        self,
        product_id: str,
        top_k: int = 5,
        strategy: str = "hybrid",
    ) -> HybridRecommendationResult:
        if strategy not in STRATEGIES:
            raise TrainingError("Unknown recommendation strategy")
        limit = _require_top_k(top_k)
        if strategy == "content":
            return self._single("content", product_id, limit, requested=strategy)
        if strategy == "collaborative":
            return self._single("collaborative", product_id, limit, requested=strategy)
        return self._hybrid(product_id, limit)

    def _single(
        self,
        source: str,
        product_id: str,
        top_k: int,
        *,
        requested: str,
    ) -> HybridRecommendationResult:
        ranker = self.content if source == "content" else self.collaborative
        if ranker is None:
            raise ModelUnavailableError(f"{source} model is unavailable")
        result = ranker.recommend(product_id, top_k)
        version = ranker.model_version
        return HybridRecommendationResult(
            query_product_id=result.query_product_id,
            requested_strategy=requested,
            strategy=source,
            model_version=version,
            fallback_reason=None,
            recommendations=tuple(
                HybridRecommendation(
                    product_id=item.product_id,
                    score=item.score,
                    rank=item.rank,
                    model_version=version,
                    strategy=source,
                )
                for item in result.recommendations
            ),
        )

    def _hybrid(self, product_id: str, top_k: int) -> HybridRecommendationResult:
        content_result, content_error = _safe_recommend(self.content, product_id, top_k)
        collab_result, collab_error = _safe_recommend(self.collaborative, product_id, top_k)
        if content_error and collab_error:
            if isinstance(content_error, UnknownProductError) or isinstance(
                collab_error, UnknownProductError
            ):
                raise UnknownProductError(product_id.strip())
            raise ModelUnavailableError("Hybrid models are unavailable")
        if content_result is None and collab_result is not None:
            mapped = self._from_result(collab_result, "collaborative", top_k)
            return _with_request(
                mapped,
                requested="hybrid",
                fallback_reason="content_model_unavailable"
                if self.content is None or not isinstance(content_error, UnknownProductError)
                else "unknown_to_content_model",
            )
        if collab_result is None and content_result is not None:
            mapped = self._from_result(content_result, "content", top_k)
            reason = (
                "collaborative_model_unavailable"
                if self.collaborative is None
                else "insufficient_collaborative_evidence"
                if collab_error is None
                else "unknown_to_collaborative_model"
            )
            if isinstance(collab_error, UnknownProductError):
                reason = "unknown_to_collaborative_model"
            return _with_request(mapped, requested="hybrid", fallback_reason=reason)
        assert content_result is not None and collab_result is not None
        if not collab_result.recommendations:
            mapped = self._from_result(content_result, "content", top_k)
            return _with_request(
                mapped,
                requested="hybrid",
                fallback_reason="insufficient_collaborative_evidence",
            )
        if not content_result.recommendations:
            mapped = self._from_result(collab_result, "collaborative", top_k)
            return _with_request(
                mapped,
                requested="hybrid",
                fallback_reason="insufficient_content_evidence",
            )
        fused = _fuse(
            content_result,
            collab_result,
            self.config,
            query_id=content_result.query_product_id,
        )
        fused.sort(key=lambda item: (-item[0], item[1]))
        chosen = fused[:top_k]
        return HybridRecommendationResult(
            query_product_id=content_result.query_product_id,
            requested_strategy="hybrid",
            strategy="hybrid",
            model_version=self.model_version,
            fallback_reason=None,
            recommendations=tuple(
                HybridRecommendation(
                    product_id=item_id,
                    score=score,
                    rank=rank,
                    model_version=self.model_version,
                    strategy="hybrid",
                )
                for rank, (score, item_id) in enumerate(chosen, start=1)
            ),
        )

    def _from_result(
        self,
        result: RecommendationResult,
        strategy: str,
        top_k: int,
    ) -> HybridRecommendationResult:
        version = result.model_version
        return HybridRecommendationResult(
            query_product_id=result.query_product_id,
            requested_strategy=strategy,
            strategy=strategy,
            model_version=version,
            fallback_reason=None,
            recommendations=tuple(
                HybridRecommendation(
                    product_id=item.product_id,
                    score=item.score,
                    rank=item.rank,
                    model_version=version,
                    strategy=strategy,
                )
                for item in result.recommendations[:top_k]
            ),
        )


def _safe_recommend(
    ranker: Ranker | None,
    product_id: str,
    top_k: int,
) -> tuple[RecommendationResult | None, Exception | None]:
    if ranker is None:
        return None, ModelUnavailableError("model unavailable")
    try:
        return ranker.recommend(product_id, top_k), None
    except UnknownProductError as exc:
        return None, exc


def _fuse(
    content: RecommendationResult,
    collaborative: RecommendationResult,
    config: HybridConfig,
    *,
    query_id: str,
) -> list[tuple[float, str]]:
    content_weight, collab_weight = _normalized_weights(config)
    if config.fusion == "reciprocal_rank":
        scores = _add(
            _rrf(content, content_weight, config.rrf_k),
            _rrf(collaborative, collab_weight, config.rrf_k),
        )
    else:
        scores = _add(
            _scale(_minmax(content), content_weight),
            _scale(_minmax(collaborative), collab_weight),
        )
    scores.pop(query_id, None)
    return [
        (round(score, SCORE_DECIMALS), product_id)
        for product_id, score in scores.items()
        if math.isfinite(score) and score > 0 and product_id != query_id
    ]


def _rrf(result: RecommendationResult, weight: float, rrf_k: int) -> dict[str, float]:
    return {item.product_id: weight / (rrf_k + item.rank) for item in result.recommendations}


def _minmax(result: RecommendationResult) -> dict[str, float]:
    if not result.recommendations:
        return {}
    values = [item.score for item in result.recommendations]
    low = min(values)
    high = max(values)
    span = high - low
    scaled: dict[str, float] = {}
    for item in result.recommendations:
        scaled[item.product_id] = 1.0 if span == 0 else (item.score - low) / span
    return scaled


def _scale(scores: dict[str, float], weight: float) -> dict[str, float]:
    return {product_id: weight * score for product_id, score in scores.items()}


def _add(left: dict[str, float], right: dict[str, float]) -> dict[str, float]:
    merged = dict(left)
    for product_id, score in right.items():
        merged[product_id] = merged.get(product_id, 0.0) + score
    return merged


def _normalized_weights(config: HybridConfig) -> tuple[float, float]:
    total = config.content_weight + config.collaborative_weight
    return config.content_weight / total, config.collaborative_weight / total


def _validated_config(config: HybridConfig) -> HybridConfig:
    if config.fusion not in FUSION_MODES:
        raise TrainingError("Unknown hybrid fusion mode")
    for value in (config.content_weight, config.collaborative_weight):
        if not math.isfinite(value) or value < 0:
            raise TrainingError("Hybrid weights must be finite and at least 0")
    if config.content_weight + config.collaborative_weight <= 0:
        raise TrainingError("At least one hybrid weight must be positive")
    if config.rrf_k < 1 or config.rrf_k > 1000:
        raise TrainingError("Reciprocal-rank constant is out of range")
    return config


def _with_request(
    result: HybridRecommendationResult,
    *,
    requested: str,
    fallback_reason: str,
) -> HybridRecommendationResult:
    return HybridRecommendationResult(
        query_product_id=result.query_product_id,
        requested_strategy=requested,
        strategy=result.strategy,
        model_version=result.model_version,
        fallback_reason=fallback_reason,
        recommendations=result.recommendations,
    )


def _require_top_k(top_k: int) -> int:
    if isinstance(top_k, bool) or not isinstance(top_k, int) or top_k < 1 or top_k > MAX_TOP_K:
        raise TrainingError("top_k must be an integer from 1 through 100")
    return top_k

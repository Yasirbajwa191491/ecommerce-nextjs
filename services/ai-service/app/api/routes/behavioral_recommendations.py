"""Authenticated behavioral recommendation inference.

`/recommendations/content` is unchanged. This router adds strategy selection.
A collaborative request never returns content results under a collaborative label.
Hybrid may name a component fallback in `strategy` and `fallback_reason`.
"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.config import Settings
from app.core.security import service_auth
from app.ml.constants import MAX_TOP_K
from app.ml.models.hybrid_recommender import HybridRecommender

router = APIRouter(
    prefix="/recommendations",
    tags=["recommendations"],
    dependencies=[Depends(service_auth)],
)

StrategyName = Literal["content", "collaborative", "hybrid", "neural"]


class BehavioralRecommendationRequest(BaseModel):
    product_id: str = Field(min_length=1, max_length=128)
    top_k: int = Field(default=8, ge=1, le=MAX_TOP_K)
    strategy: StrategyName


class BehavioralRecommendationBatchRequest(BaseModel):
    product_ids: list[str] = Field(min_length=1, max_length=10)
    top_k: int = Field(default=8, ge=1, le=MAX_TOP_K)
    strategy: StrategyName


class BehavioralRecommendationItem(BaseModel):
    product_id: str
    score: float
    rank: int
    model_version: str
    strategy: StrategyName


class OfflineEvaluationSummary(BaseModel):
    warning: str
    synthetic: bool = True
    precision_at_k: float | None = None
    recall_at_k: float | None = None
    hit_rate_at_k: float | None = None
    ndcg_at_k: float | None = None


class BehavioralRecommendationResponse(BaseModel):
    product_id: str
    requested_strategy: StrategyName
    strategy: StrategyName
    model_version: str
    fallback_reason: str | None = None
    score_kind: str | None = None
    trained_at: str | None = None
    dataset_fingerprint: str | None = None
    validation_loss: float | None = None
    evaluation_summary: OfflineEvaluationSummary | None = None
    recommendations: list[BehavioralRecommendationItem]


class BehavioralRecommendationBatchResponse(BaseModel):
    requested_strategy: StrategyName
    results: list[BehavioralRecommendationResponse]


def _require_inference(settings: Settings) -> None:
    if not settings.enable_model_inference:
        raise HTTPException(status_code=503, detail="model_inference_disabled")


def _build(request: Request, settings: Settings, strategy: StrategyName) -> HybridRecommender:
    from app.ml.errors import ArtifactError, IncompatibleArtifactError, MachineLearningError
    from app.ml.inference.behavioral import (
        open_cached_collaborative_model,
        open_cached_hybrid_config,
    )
    from app.ml.inference.recommendations import open_cached_content_model

    content = None
    collaborative = None
    config = None
    try:
        if strategy in {"content", "hybrid"} and settings.content_model_dir:
            content = open_cached_content_model(request.app.state, settings.content_model_dir)
        if strategy in {"collaborative", "hybrid"} and settings.collaborative_model_dir:
            collaborative = open_cached_collaborative_model(
                request.app.state,
                settings.collaborative_model_dir,
            )
        if strategy == "hybrid" and settings.hybrid_model_dir:
            config = open_cached_hybrid_config(request.app.state, settings.hybrid_model_dir)
    except IncompatibleArtifactError as exc:
        raise HTTPException(status_code=503, detail="invalid_model_version") from exc
    except (ArtifactError, MachineLearningError, OSError) as exc:
        raise HTTPException(status_code=503, detail="model_unavailable") from exc
    if strategy == "content" and content is None:
        raise HTTPException(status_code=503, detail="model_unavailable")
    if strategy == "collaborative" and collaborative is None:
        raise HTTPException(status_code=503, detail="model_unavailable")
    if strategy == "hybrid" and content is None and collaborative is None:
        raise HTTPException(status_code=503, detail="model_unavailable")
    return HybridRecommender(content=content, collaborative=collaborative, config=config)


def _one(
    recommender: HybridRecommender,
    product_id: str,
    top_k: int,
    strategy: StrategyName,
) -> BehavioralRecommendationResponse:
    from app.ml.errors import ModelUnavailableError, TrainingError, UnknownProductError

    try:
        result = recommender.recommend(product_id, top_k, strategy=strategy)
    except UnknownProductError as exc:
        raise HTTPException(status_code=404, detail="unknown_product") from exc
    except (ModelUnavailableError, TrainingError) as exc:
        raise HTTPException(status_code=503, detail="model_unavailable") from exc
    if result.strategy == "collaborative" and strategy == "content":
        raise HTTPException(status_code=503, detail="model_unavailable")
    if result.strategy == "content" and strategy == "collaborative":
        raise HTTPException(status_code=503, detail="model_unavailable")
    return BehavioralRecommendationResponse(
        product_id=result.query_product_id,
        requested_strategy=result.requested_strategy,  # type: ignore[arg-type]
        strategy=result.strategy,  # type: ignore[arg-type]
        model_version=result.model_version,
        fallback_reason=result.fallback_reason,
        recommendations=[
            BehavioralRecommendationItem(
                product_id=item.product_id,
                score=item.score,
                rank=item.rank,
                model_version=item.model_version,
                strategy=item.strategy,  # type: ignore[arg-type]
            )
            for item in result.recommendations
        ],
    )


@router.post("/behavioral", response_model=BehavioralRecommendationResponse)
async def recommend_behavioral(
    body: BehavioralRecommendationRequest,
    request: Request,
) -> BehavioralRecommendationResponse:
    settings: Settings = request.app.state.settings
    _require_inference(settings)
    if body.strategy == "neural":
        return _serve_neural(request, settings, body.product_id, body.top_k)
    recommender = _build(request, settings, body.strategy)
    return _one(recommender, body.product_id, body.top_k, body.strategy)


@router.post("/behavioral/batch", response_model=BehavioralRecommendationBatchResponse)
async def recommend_behavioral_batch(
    body: BehavioralRecommendationBatchRequest,
    request: Request,
) -> BehavioralRecommendationBatchResponse:
    settings: Settings = request.app.state.settings
    _require_inference(settings)
    if body.strategy == "neural":
        return BehavioralRecommendationBatchResponse(
            requested_strategy=body.strategy,
            results=[
                _serve_neural(request, settings, product_id, body.top_k)
                for product_id in body.product_ids
            ],
        )
    recommender = _build(request, settings, body.strategy)
    return BehavioralRecommendationBatchResponse(
        requested_strategy=body.strategy,
        results=[
            _one(recommender, product_id, body.top_k, body.strategy)
            for product_id in body.product_ids
        ],
    )


def _serve_neural(
    request: Request,
    settings: Settings,
    product_id: str,
    top_k: int,
) -> BehavioralRecommendationResponse:
    from app.ml.errors import (
        ArtifactError,
        IncompatibleArtifactError,
        MachineLearningError,
        TrainingError,
        UnknownProductError,
    )
    from app.ml.inference.neural import open_cached_neural_model

    if not settings.neural_model_dir:
        raise HTTPException(status_code=503, detail="model_unavailable")
    try:
        model = open_cached_neural_model(request.app.state, settings.neural_model_dir)
    except IncompatibleArtifactError as exc:
        raise HTTPException(status_code=503, detail="invalid_model_version") from exc
    except (ArtifactError, MachineLearningError, OSError) as exc:
        raise HTTPException(status_code=503, detail="model_unavailable") from exc
    try:
        result = model.recommend(product_id, top_k)
    except UnknownProductError:
        return _content_fallback(
            request,
            settings,
            product_id,
            top_k,
            "unknown_to_neural_model",
        )
    except TrainingError as exc:
        raise HTTPException(status_code=503, detail="model_unavailable") from exc
    if result.cold_start or not result.recommendations:
        reason = "neural_cold_start" if result.cold_start else "insufficient_neural_evidence"
        return _content_fallback(request, settings, product_id, top_k, reason)
    return BehavioralRecommendationResponse(
        product_id=result.query_product_id,
        requested_strategy="neural",
        strategy="neural",
        model_version=result.model_version,
        fallback_reason=None,
        score_kind=result.score_kind,
        trained_at=result.trained_at or None,
        dataset_fingerprint=result.dataset_fingerprint or None,
        validation_loss=result.validation_loss,
        evaluation_summary=_evaluation_summary(result.evaluation_summary),
        recommendations=[
            BehavioralRecommendationItem(
                product_id=item.product_id,
                score=item.score,
                rank=item.rank,
                model_version=item.model_version,
                strategy="neural",
            )
            for item in result.recommendations
        ],
    )


def _content_fallback(
    request: Request,
    settings: Settings,
    product_id: str,
    top_k: int,
    reason: str,
) -> BehavioralRecommendationResponse:
    from app.ml.errors import (
        ArtifactError,
        IncompatibleArtifactError,
        MachineLearningError,
        UnknownProductError,
    )
    from app.ml.inference.recommendations import open_cached_content_model

    if not settings.content_model_dir:
        if reason == "unknown_to_neural_model":
            raise HTTPException(status_code=404, detail="unknown_product")
        raise HTTPException(status_code=503, detail="model_unavailable")
    try:
        content = open_cached_content_model(request.app.state, settings.content_model_dir)
    except IncompatibleArtifactError as exc:
        raise HTTPException(status_code=503, detail="invalid_model_version") from exc
    except (ArtifactError, MachineLearningError, OSError) as exc:
        if reason == "unknown_to_neural_model":
            raise HTTPException(status_code=404, detail="unknown_product") from exc
        raise HTTPException(status_code=503, detail="model_unavailable") from exc
    try:
        result = content.recommend(product_id, top_k)
    except UnknownProductError as exc:
        raise HTTPException(status_code=404, detail="unknown_product") from exc
    return BehavioralRecommendationResponse(
        product_id=result.query_product_id,
        requested_strategy="neural",
        strategy="content",
        model_version=result.model_version,
        fallback_reason=reason,
        recommendations=[
            BehavioralRecommendationItem(
                product_id=item.product_id,
                score=item.score,
                rank=item.rank,
                model_version=item.model_version,
                strategy="content",
            )
            for item in result.recommendations
        ],
    )


def _evaluation_summary(payload: dict[str, object] | None) -> OfflineEvaluationSummary | None:
    if not payload:
        return None
    warning = payload.get("warning")
    if not isinstance(warning, str) or not warning:
        return None
    return OfflineEvaluationSummary(
        warning=warning,
        synthetic=payload.get("synthetic") is not False,
        precision_at_k=_optional_float(payload.get("precision_at_k")),
        recall_at_k=_optional_float(payload.get("recall_at_k")),
        hit_rate_at_k=_optional_float(payload.get("hit_rate_at_k")),
        ndcg_at_k=_optional_float(payload.get("ndcg_at_k")),
    )


def _optional_float(value: object) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value)

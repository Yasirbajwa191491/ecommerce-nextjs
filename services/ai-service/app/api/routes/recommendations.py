"""Authenticated content-recommendation inference.

Startup does not load an artifact. A request loads one only when
ENABLE_MODEL_INFERENCE is true and CONTENT_MODEL_DIR points at a trusted run.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.config import Settings
from app.core.security import service_auth
from app.ml.constants import MAX_TOP_K

router = APIRouter(
    prefix="/recommendations",
    tags=["recommendations"],
    dependencies=[Depends(service_auth)],
)


class ContentRecommendationRequest(BaseModel):
    product_id: str = Field(min_length=1, max_length=128)
    top_k: int = Field(default=8, ge=1, le=MAX_TOP_K)


class ContentRecommendationBatchRequest(BaseModel):
    product_ids: list[str] = Field(min_length=1, max_length=25)
    top_k: int = Field(default=8, ge=1, le=MAX_TOP_K)


class RecommendationItem(BaseModel):
    product_id: str
    score: float
    rank: int


class ContentRecommendationResponse(BaseModel):
    product_id: str
    model_version: str
    artifact_version: str
    dataset_fingerprint: str
    recommendations: list[RecommendationItem]


class ContentRecommendationBatchResponse(BaseModel):
    model_version: str
    artifact_version: str
    dataset_fingerprint: str
    results: list[ContentRecommendationResponse]


def _require_inference(settings: Settings) -> None:
    if not settings.enable_model_inference:
        raise HTTPException(status_code=503, detail="model_inference_disabled")


def _load_model(request: Request, settings: Settings):
    from app.ml.errors import ArtifactError, IncompatibleArtifactError, MachineLearningError
    from app.ml.inference.recommendations import open_cached_content_model

    try:
        return open_cached_content_model(request.app.state, settings.content_model_dir)
    except IncompatibleArtifactError as exc:
        raise HTTPException(status_code=503, detail="invalid_model_version") from exc
    except (ArtifactError, MachineLearningError, OSError) as exc:
        raise HTTPException(status_code=503, detail="model_unavailable") from exc


def _one(model, product_id: str, top_k: int) -> ContentRecommendationResponse:
    from app.ml.errors import UnknownProductError

    try:
        result = model.recommend(product_id, top_k)
    except UnknownProductError as exc:
        raise HTTPException(status_code=404, detail="unknown_product") from exc
    return ContentRecommendationResponse(
        product_id=result.query_product_id,
        model_version=model.model_version,
        artifact_version=model.artifact_version,
        dataset_fingerprint=model.dataset_fingerprint,
        recommendations=[
            RecommendationItem(product_id=item.product_id, score=item.score, rank=item.rank)
            for item in result.recommendations
        ],
    )


@router.post("/content", response_model=ContentRecommendationResponse)
async def recommend_content(
    body: ContentRecommendationRequest,
    request: Request,
) -> ContentRecommendationResponse:
    settings: Settings = request.app.state.settings
    _require_inference(settings)
    model = _load_model(request, settings)
    return _one(model, body.product_id, body.top_k)


@router.post("/content/batch", response_model=ContentRecommendationBatchResponse)
async def recommend_content_batch(
    body: ContentRecommendationBatchRequest,
    request: Request,
) -> ContentRecommendationBatchResponse:
    settings: Settings = request.app.state.settings
    _require_inference(settings)
    model = _load_model(request, settings)
    results = [_one(model, product_id, body.top_k) for product_id in body.product_ids]
    return ContentRecommendationBatchResponse(
        model_version=model.model_version,
        artifact_version=model.artifact_version,
        dataset_fingerprint=model.dataset_fingerprint,
        results=results,
    )

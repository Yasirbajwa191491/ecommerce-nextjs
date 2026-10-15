"""Process liveness and application readiness.

Readiness reports only checks this process can make. It does not call Convex,
LLM providers, or model hosts. When inference is enabled, it loads the trusted
artifact configured by CONTENT_MODEL_DIR. Startup does not.
"""

from typing import Literal

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.core.config import Settings
from app.schemas import HealthLiveResponse, HealthReadyResponse, ReadyChecks

router = APIRouter(tags=["health"])

ModelInferenceCheck = Literal["disabled", "unavailable", "ready"]


@router.get("/health/live", response_model=HealthLiveResponse)
async def liveness() -> HealthLiveResponse:
    return HealthLiveResponse(status="live")


def model_inference_check(request: Request) -> ModelInferenceCheck:
    settings: Settings = request.app.state.settings
    if not settings.enable_model_inference:
        return "disabled"
    from app.ml.errors import ArtifactError, IncompatibleArtifactError, MachineLearningError
    from app.ml.inference.recommendations import open_cached_content_model

    try:
        open_cached_content_model(request.app.state, settings.content_model_dir)
    except (ArtifactError, IncompatibleArtifactError, MachineLearningError, OSError):
        return "unavailable"
    return "ready"


@router.get(
    "/health/ready",
    response_model=HealthReadyResponse,
    responses={503: {"model": HealthReadyResponse}},
)
async def readiness(request: Request) -> JSONResponse:
    inference = model_inference_check(request)
    if inference == "ready":
        payload = HealthReadyResponse(
            status="ready",
            checks=ReadyChecks(application="ok", model_inference="ready"),
        )
        return JSONResponse(status_code=200, content=payload.model_dump())
    if inference == "disabled":
        payload = HealthReadyResponse(
            status="ready",
            checks=ReadyChecks(application="ok", model_inference="disabled"),
        )
        return JSONResponse(status_code=200, content=payload.model_dump())
    payload = HealthReadyResponse(
        status="not_ready",
        checks=ReadyChecks(application="ok", model_inference="unavailable"),
    )
    return JSONResponse(status_code=503, content=payload.model_dump())

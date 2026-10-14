"""Process liveness and application readiness.

Readiness reports only checks this process can make. It does not call Convex,
LLM providers, or model hosts.
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.core.config import Settings
from app.schemas import HealthLiveResponse, HealthReadyResponse, ReadyChecks

router = APIRouter(tags=["health"])


@router.get("/health/live", response_model=HealthLiveResponse)
async def liveness() -> HealthLiveResponse:
    return HealthLiveResponse(status="live")


@router.get(
    "/health/ready",
    response_model=HealthReadyResponse,
    responses={503: {"model": HealthReadyResponse}},
)
async def readiness(request: Request) -> JSONResponse:
    settings: Settings = request.app.state.settings
    if settings.enable_model_inference:
        payload = HealthReadyResponse(
            status="not_ready",
            checks=ReadyChecks(application="ok", model_inference="unavailable"),
        )
        return JSONResponse(status_code=503, content=payload.model_dump())
    payload = HealthReadyResponse(
        status="ready",
        checks=ReadyChecks(application="ok", model_inference="disabled"),
    )
    return JSONResponse(status_code=200, content=payload.model_dump())

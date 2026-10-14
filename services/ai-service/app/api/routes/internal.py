"""Authenticated internal status.

Every route on this router requires the service bearer token. Status does not
load a recommendation artifact. Content inference lives on its own router and
loads an artifact only for an authenticated request when inference is enabled.
"""

from fastapi import APIRouter, Depends, Request

from app.core.config import Settings
from app.core.security import service_auth
from app.schemas import InternalStatusResponse

router = APIRouter(
    prefix="/internal",
    tags=["internal"],
    dependencies=[Depends(service_auth)],
)


@router.get("/status", response_model=InternalStatusResponse)
async def internal_status(request: Request) -> InternalStatusResponse:
    settings: Settings = request.app.state.settings
    return InternalStatusResponse(
        status="ok",
        inference_enabled=settings.enable_model_inference,
    )

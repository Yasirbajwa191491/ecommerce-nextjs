"""Central API router. Health probes stay outside the versioned prefix."""

from fastapi import APIRouter, FastAPI

from app.api.routes.behavioral_recommendations import router as behavioral_recommendations_router
from app.api.routes.health import router as health_router
from app.api.routes.internal import router as internal_router
from app.api.routes.recommendations import router as recommendations_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(internal_router)
api_router.include_router(recommendations_router)
api_router.include_router(behavioral_recommendations_router)


def include_routers(app: FastAPI) -> None:
    app.include_router(health_router)
    app.include_router(api_router)

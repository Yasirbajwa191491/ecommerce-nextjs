"""Application factory.

Importing this module does not download models or contact Convex.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import __version__
from app.api.router import include_routers
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, service_logger


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: Settings = app.state.settings
    logger = service_logger()
    logger.info(
        "application_start env=%s inference_enabled=%s",
        settings.app_env,
        settings.enable_model_inference,
    )
    if settings.enable_model_inference:
        logger.warning("model_inference_requested_but_not_implemented")
    yield
    logger.info("application_stop")


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings or get_settings()
    configure_logging(resolved)
    publish_docs = resolved.app_env == "development"
    app = FastAPI(
        title=resolved.app_name,
        version=__version__,
        debug=False,
        docs_url="/docs" if publish_docs else None,
        redoc_url="/redoc" if publish_docs else None,
        openapi_url="/openapi.json" if publish_docs else None,
        lifespan=lifespan,
    )
    app.state.settings = resolved
    register_exception_handlers(app)
    include_routers(app)
    return app


app = create_app()

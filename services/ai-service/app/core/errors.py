"""Safe API error responses. Details stay generic and omit request bodies."""

import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.schemas import ValidationErrorItem

_logger = logging.getLogger("ecommerce_ai_service")
_SAFE_HEADER = "WWW-Authenticate"


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def handle_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        items: list[ValidationErrorItem] = []
        for error in exc.errors():
            items.append(
                ValidationErrorItem(
                    loc=[str(part) for part in error.get("loc", ())],
                    msg=str(error.get("msg", "Invalid request")),
                    type=str(error.get("type", "value_error")),
                )
            )
        return JSONResponse(
            status_code=422,
            content={"detail": [item.model_dump() for item in items]},
        )

    @app.exception_handler(HTTPException)
    async def handle_http(_: Request, exc: HTTPException) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
        headers = {}
        if exc.headers and _SAFE_HEADER in exc.headers:
            headers[_SAFE_HEADER] = exc.headers[_SAFE_HEADER]
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": detail},
            headers=headers,
        )

    @app.exception_handler(Exception)
    async def handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
        _logger.error("Unhandled application error", exc_info=exc)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

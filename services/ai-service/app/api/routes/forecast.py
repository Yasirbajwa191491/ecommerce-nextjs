"""Authenticated demand-forecast inference. Training is not available over HTTP."""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import Settings
from app.core.security import service_auth
from app.ml.forecasting.artifacts import ArtifactError, load_artifact
from app.ml.forecasting.service import HORIZONS, forecast_payload

router = APIRouter(
    prefix="/internal/forecast",
    tags=["forecast"],
    dependencies=[Depends(service_auth)],
)


class ForecastPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: str
    units: float | None = None
    observation: str = "sale"
    order_count: int = 0
    inventory_state: str = "unknown"


class ForecastSeries(BaseModel):
    model_config = ConfigDict(extra="forbid")
    entity_type: str = "product"
    entity_id: str = Field(min_length=1, max_length=128)
    category_id: str | None = None
    current_stock: float | None = None
    points: list[ForecastPoint] = Field(min_length=1, max_length=400)


class ForecastRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    horizon_days: int = 14
    strategy: str = "auto"
    series: list[ForecastSeries] = Field(min_length=1, max_length=20)
    lead_time_days: int | None = Field(default=None, ge=1, le=90)


def _settings(request: Request) -> Settings:
    return request.app.state.settings


def _run(body: ForecastRequest, request: Request) -> dict[str, object]:
    if body.horizon_days not in HORIZONS:
        raise HTTPException(status_code=400, detail="Horizon must be 7, 14, or 30 days")
    if body.strategy not in {
        "auto",
        "naive",
        "seasonal_naive",
        "moving_average",
        "exponential_smoothing",
        "ml_regression",
        "intermittent",
    }:
        raise HTTPException(status_code=400, detail="Forecast strategy is not supported")
    try:
        return forecast_payload(body.model_dump(), artifact_root=_settings(request).artifacts_dir)
    except ValueError as error:
        message = str(error)
        status = 409 if "artifact" in message else 400
        raise HTTPException(status_code=status, detail=message) from error


@router.get("/status")
async def forecast_status(request: Request) -> dict[str, object]:
    try:
        _model, metadata = load_artifact(_settings(request).artifacts_dir)
    except (ArtifactError, OSError, ValueError):
        return {"ready": False, "model_version": "demand-forecast-v1"}
    return {
        "ready": True,
        "model_version": metadata.get("model_version"),
        "trained_at": metadata.get("trained_at"),
        "dataset_label": metadata.get("dataset_label"),
        "data_cutoff": metadata.get("data_cutoff"),
        "statistically_weak": metadata.get("statistically_weak"),
        "uncertainty": metadata.get("uncertainty", {}).get("label"),
    }


@router.post("/demand")
async def forecast_demand(body: ForecastRequest, request: Request) -> dict[str, object]:
    if len(body.series) != 1:
        raise HTTPException(status_code=400, detail="Demand forecast accepts one series")
    return _run(body, request)


@router.post("/batch")
async def forecast_batch(body: ForecastRequest, request: Request) -> dict[str, object]:
    return _run(body, request)

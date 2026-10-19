"""Authenticated MLOps diagnostics.

These routes do not load recommendation or forecast models into the serving
caches. Drift and monitoring stay disabled unless their environment gates
are true.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import Settings
from app.core.security import service_auth
from app.mlops.activation import ActivationManager
from app.mlops.drift import (
    jensen_shannon,
    missing_value_drift,
    population_stability_index,
)
from app.mlops.families import MODEL_FAMILIES
from app.mlops.monitoring import MonitoringStore
from app.mlops.paths import UnsafePathError, configured_family_dir
from app.mlops.retraining import plan_job
from app.mlops.validation import validate_directory

router = APIRouter(
    prefix="/internal/mlops",
    tags=["mlops"],
    dependencies=[Depends(service_auth)],
)

FamilyName = Literal["content", "collaborative", "hybrid", "neural", "demand_forecast"]


class FamilyBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    family: FamilyName


class DriftBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    metric: Literal["psi", "js", "missing"]
    reference: list[float] | list[str] | list[bool] = Field(max_length=5000)
    current: list[float] | list[str] | list[bool] = Field(max_length=5000)


class MonitorBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    family: FamilyName
    model_version: str = Field(min_length=3, max_length=80)
    time_bucket: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    outcome: Literal["success", "failure", "timeout", "fallback"]
    latency_ms: float = Field(ge=0, le=60000)
    error_category: str = Field(default="", max_length=80)


class RetrainBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_type: Literal[
        "content_retrain",
        "collaborative_retrain",
        "neural_retrain",
        "forecast_retrain",
        "hybrid_config_refresh",
    ]
    dataset_label: Literal["synthetic", "product_metadata", "authorized_aggregate", "configuration"]


def _manager(request: Request) -> ActivationManager:
    manager = getattr(request.app.state, "mlops_activation", None)
    if manager is None:
        manager = ActivationManager()
        request.app.state.mlops_activation = manager
    return manager


def _monitor(request: Request) -> MonitoringStore:
    store = getattr(request.app.state, "mlops_monitor", None)
    if store is None:
        store = MonitoringStore()
        request.app.state.mlops_monitor = store
    return store


def _family_presence(settings: Settings, family: str) -> str:
    try:
        directory = configured_family_dir(settings, family)
    except UnsafePathError:
        return "unavailable"
    if directory is None or not directory.is_dir():
        return "missing"
    names = {path.name for path in directory.iterdir() if path.is_file()}
    if {"manifest.json", "model.joblib"} & names or {"metadata.json", "regressor.joblib"} & names:
        return "present"
    if "hybrid.json" in names or "weights.pt" in names:
        return "present"
    return "incomplete"


@router.get("/status")
async def mlops_status(request: Request) -> dict[str, object]:
    settings: Settings = request.app.state.settings
    manager = _manager(request)
    store = _monitor(request)
    active = {
        family: slot.version
        for family in MODEL_FAMILIES
        if (slot := manager.slot(family)) is not None
    }
    return {
        "monitoring_enabled": settings.mlops_monitoring_enabled,
        "drift_detection_enabled": settings.mlops_drift_detection_enabled,
        "retraining_enabled": settings.mlops_retraining_enabled,
        "registered_model_count": len(MODEL_FAMILIES),
        "artifact_availability": {
            family: _family_presence(settings, family) for family in MODEL_FAMILIES
        },
        "active_diagnostic_versions": active,
        "validated_model_count": len(active),
        "last_monitoring_run": store.last_run or None,
        "last_drift_evaluation": getattr(request.app.state, "mlops_last_drift", None),
        "pending_retraining_requests": 0,
        "customer_serving": "unchanged",
    }


@router.post("/validate")
async def validate_family(body: FamilyBody, request: Request) -> dict[str, object]:
    settings: Settings = request.app.state.settings
    try:
        directory = configured_family_dir(settings, body.family)
    except UnsafePathError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unsafe_path") from exc
    if directory is None:
        return {"ok": False, "reasons": ["missing_artifact"], "customer_serving": "unchanged"}
    report = validate_directory(body.family, directory)
    payload = report.as_dict()
    payload["customer_serving"] = "unchanged"
    return payload


@router.post("/activate")
async def activate_family(body: FamilyBody, request: Request) -> dict[str, object]:
    settings: Settings = request.app.state.settings
    directory = configured_family_dir(settings, body.family)
    report = validate_directory(body.family, directory) if directory is not None else None
    available = bool(report and report.ok)
    version = report.model_version if report else body.family

    def load() -> dict[str, str]:
        if report is None:
            raise RuntimeError("missing")
        return {"version": report.model_version, "checksum": report.checksum}

    def smoke(candidate: object) -> None:
        if not isinstance(candidate, dict) or not candidate.get("checksum"):
            raise RuntimeError("smoke_failed")

    result = _manager(request).activate(
        body.family,
        version,
        available=available,
        load=load,
        smoke=smoke,
    )
    return {
        "outcome": result.outcome,
        "runtime_status": result.runtime_status,
        "customer_serving": result.customer_serving,
        "customer_deployment": result.customer_deployment,
        "active_version": result.active_version,
        "reason": result.reason,
    }


@router.post("/rollback")
async def rollback_family(body: FamilyBody, request: Request) -> dict[str, object]:
    manager = _manager(request)
    current = manager.slot(body.family)
    settings: Settings = request.app.state.settings
    directory = configured_family_dir(settings, body.family)
    report = validate_directory(body.family, directory) if directory is not None else None
    result = manager.rollback(
        body.family,
        available=bool(report and report.ok and current and current.previous_payload is not None),
    )
    return {
        "outcome": result.outcome,
        "runtime_status": result.runtime_status,
        "customer_serving": result.customer_serving,
        "customer_deployment": result.customer_deployment,
        "active_version": result.active_version,
        "reason": result.reason,
    }


@router.post("/drift")
async def drift(body: DriftBody, request: Request) -> dict[str, object]:
    settings: Settings = request.app.state.settings
    if not settings.mlops_drift_detection_enabled:
        return {"status": "disabled", "severity": "insufficient_data", "score": None}
    if body.metric == "psi":
        result = population_stability_index(
            [float(value) for value in body.reference],
            [float(value) for value in body.current],
        )
    elif body.metric == "js":
        result = jensen_shannon(
            [str(value) for value in body.reference],
            [str(value) for value in body.current],
        )
    else:
        result = missing_value_drift(
            [bool(value) for value in body.reference],
            [bool(value) for value in body.current],
        )
    request.app.state.mlops_last_drift = result.metric
    return {
        "status": result.status,
        "metric": result.metric,
        "severity": result.severity,
        "score": result.score,
        "sample_size": result.sample_size,
        "reason": result.reason,
    }


@router.post("/monitoring")
async def record_monitoring(body: MonitorBody, request: Request) -> dict[str, object]:
    settings: Settings = request.app.state.settings
    if not settings.mlops_monitoring_enabled:
        return {"status": "disabled"}
    bucket = _monitor(request).record(
        family=body.family,
        model_version=body.model_version,
        time_bucket=body.time_bucket,
        outcome=body.outcome,
        latency_ms=body.latency_ms,
        error_category=body.error_category,
    )
    return {"status": "recorded", "bucket": bucket.as_dict()}


@router.post("/retrain/plan")
async def retrain_plan(body: RetrainBody, request: Request) -> dict[str, object]:
    settings: Settings = request.app.state.settings
    if not settings.mlops_retraining_enabled:
        return {"executed": False, "state": "disabled", "reason": "retraining_disabled"}
    export_enabled = False
    return plan_job(
        body.job_type,
        dataset_label=body.dataset_label,
        export_enabled=export_enabled,
        execute=False,
    )

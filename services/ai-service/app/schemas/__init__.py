"""Response models that do not include credentials or deployment details."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ErrorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    detail: str


class ValidationErrorItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    loc: list[str]
    msg: str
    type: str


class ValidationErrorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    detail: list[ValidationErrorItem]


class HealthLiveResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["live"]


class ReadyChecks(BaseModel):
    model_config = ConfigDict(extra="forbid")

    application: Literal["ok"]
    model_inference: Literal["disabled", "unavailable", "ready"]


class HealthReadyResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ready", "not_ready"]
    checks: ReadyChecks


class InternalStatusResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"]
    inference_enabled: bool = Field(
        description="Reflects ENABLE_MODEL_INFERENCE. Startup does not load an artifact."
    )

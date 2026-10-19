"""Stable identifiers for models this service already trains."""

from __future__ import annotations

from dataclasses import dataclass

MODEL_FAMILIES = (
    "content",
    "collaborative",
    "hybrid",
    "neural",
    "demand_forecast",
)


@dataclass(frozen=True)
class FamilyContract:
    family: str
    version_prefix: str
    feature_schema: str
    manifest_name: str
    payload_name: str | None
    serialization: str
    requires_dependency: bool


CONTRACTS: dict[str, FamilyContract] = {
    "content": FamilyContract(
        family="content",
        version_prefix="content-v",
        feature_schema="content-features-v1",
        manifest_name="manifest.json",
        payload_name="model.joblib",
        serialization="joblib",
        requires_dependency=True,
    ),
    "collaborative": FamilyContract(
        family="collaborative",
        version_prefix="collaborative-v",
        feature_schema="behavioral-implicit-v1",
        manifest_name="manifest.json",
        payload_name="model.joblib",
        serialization="joblib",
        requires_dependency=True,
    ),
    "hybrid": FamilyContract(
        family="hybrid",
        version_prefix="hybrid-v",
        feature_schema="hybrid-config-v1",
        manifest_name="hybrid.json",
        payload_name=None,
        serialization="json",
        requires_dependency=False,
    ),
    "neural": FamilyContract(
        family="neural",
        version_prefix="neural-v",
        feature_schema="behavioral-implicit-v1",
        manifest_name="manifest.json",
        payload_name="weights.pt",
        serialization="torch_state_dict",
        requires_dependency=True,
    ),
    "demand_forecast": FamilyContract(
        family="demand_forecast",
        version_prefix="demand-forecast-v",
        feature_schema="forecast-features-v1",
        manifest_name="metadata.json",
        payload_name="regressor.joblib",
        serialization="joblib",
        requires_dependency=False,
    ),
}

SUPPORTED_FORMAT_VERSION = 1
UNSAFE_SERIALIZATIONS = frozenset({"pickle", "dill", "cloudpickle"})


def contract_for(family: str) -> FamilyContract:
    try:
        return CONTRACTS[family]
    except KeyError as exc:
        raise ValueError(f"Unsupported model family: {family}") from exc


def version_matches(family: str, model_version: str) -> bool:
    contract = contract_for(family)
    if not model_version.startswith(contract.version_prefix):
        return False
    suffix = model_version[len(contract.version_prefix) :]
    return suffix.isdigit() and int(suffix) >= 1

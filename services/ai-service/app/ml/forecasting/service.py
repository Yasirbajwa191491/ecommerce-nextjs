"""Train, evaluate, and forecast without fitting a model during a request."""

from __future__ import annotations

import hashlib
import json
from datetime import date, timedelta
from importlib.metadata import version
from typing import Any

import numpy as np
import pandas as pd

from app.ml.forecasting import MODEL_VERSION
from app.ml.forecasting.artifacts import load_artifact, save_artifact
from app.ml.forecasting.backtest import history_array, score_models
from app.ml.forecasting.dataset import (
    aggregate_order_lines,
    aggregate_scopes,
    calendar_frame,
    parse_utc_date,
)
from app.ml.forecasting.features import FEATURE_COLUMNS, _features_for_series, add_features
from app.ml.forecasting.inventory import (
    days_of_stock,
    reorder_quantity,
    slow_moving,
    stockout_risk,
    trend_direction,
)
from app.ml.forecasting.models import forecast_named, new_regressor
from app.ml.forecasting.selection import select_model
from app.ml.forecasting.uncertainty import apply_band, residual_band

FORBIDDEN_KEYS = {
    "email",
    "phone",
    "address",
    "customer_email",
    "customer_phone",
    "customer_address",
    "stripe_payment_intent_id",
    "card",
}
HORIZONS = {7, 14, 30}
MAX_BATCH = 20


def validate_dataset(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    lines = payload.get("lines")
    if not isinstance(lines, list) or not lines:
        return ["Dataset lines are required"]
    seen: set[str] = set()
    for index, line in enumerate(lines):
        if not isinstance(line, dict):
            errors.append(f"Line {index} is not an object")
            continue
        forbidden = FORBIDDEN_KEYS.intersection(line)
        if forbidden:
            errors.append(f"Line {index} contains private fields")
        if not str(line.get("line_id") or ""):
            errors.append(f"Line {index} is missing line_id")
        elif str(line["line_id"]) in seen:
            errors.append(f"Line {index} repeats line_id {line['line_id']}")
        else:
            seen.add(str(line["line_id"]))
        if not str(line.get("product_id") or ""):
            errors.append(f"Line {index} is missing product_id")
        try:
            quantity = int(line.get("quantity"))
        except (TypeError, ValueError):
            errors.append(f"Line {index} has an invalid quantity")
        else:
            if quantity < 0:
                errors.append(f"Line {index} has a negative quantity")
        stamp = line.get("paid_at") or line.get("created_at")
        if not isinstance(stamp, str):
            errors.append(f"Line {index} is missing a date")
        else:
            try:
                parse_utc_date(stamp)
            except ValueError:
                errors.append(f"Line {index} has an invalid date")
    return errors


def dataset_fingerprint(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload.get("lines"), sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()[:16]


def build_frame(payload: dict[str, Any]) -> pd.DataFrame:
    sales = aggregate_order_lines(list(payload.get("lines") or []))
    as_of = date.fromisoformat(str(payload.get("as_of")))
    stockouts = {
        key: {date.fromisoformat(item) for item in values}
        for key, values in dict(payload.get("stockout_days") or {}).items()
    }
    missing = {
        key: {date.fromisoformat(item) for item in values}
        for key, values in dict(payload.get("missing_days") or {}).items()
    }
    products = calendar_frame(
        sales,
        as_of=as_of,
        stockout_days=stockouts,
        missing_days=missing,
        extra_products=list(payload.get("extra_products") or []),
    )
    return aggregate_scopes(products)


def _split_dates(frame: pd.DataFrame) -> tuple[str, str, bool]:
    dates = sorted(frame["date"].unique())
    if len(dates) < 60:
        return dates[max(0, len(dates) // 2)], dates[-1], True
    return dates[int(len(dates) * 0.6)], dates[int(len(dates) * 0.8)], False


def _ml_mae(
    regressor: Any,
    group: pd.DataFrame,
    *,
    horizon: int,
    fit_end: str,
    select_end: str,
) -> tuple[float | None, list[float]]:
    ordered = group.sort_values("date").reset_index(drop=True)
    residuals: list[float] = []
    absolute: list[float] = []
    counted = 0
    dates = ordered["date"].tolist()
    for index, day in enumerate(dates):
        if counted >= 3:
            break
        if index < 14 or day < fit_end or day >= select_end:
            continue
        if index + horizon > len(dates):
            break
        actual = pd.to_numeric(ordered["units"].iloc[index : index + horizon], errors="coerce")
        if not bool(
            ordered["observation"].iloc[index : index + horizon].isin(["sale", "zero_filled"]).all()
        ):
            continue
        predicted = recursive_ml(regressor, ordered.iloc[:index], horizon)
        absolute.extend(np.abs(actual.to_numpy(dtype=float) - predicted).tolist())
        residuals.extend((actual.to_numpy(dtype=float) - predicted).tolist())
        counted += 1
    if not absolute:
        return None, residuals
    return float(np.mean(absolute)), residuals


def recursive_ml(regressor: Any, history: pd.DataFrame, horizon: int) -> np.ndarray:
    if history.empty:
        return np.zeros(horizon, dtype=float)
    work = history.copy().reset_index(drop=True)
    predicted: list[float] = []
    for _ in range(horizon):
        last_day = date.fromisoformat(str(work["date"].iloc[-1]))
        next_day = (last_day + timedelta(days=1)).isoformat()
        placeholder = work.iloc[-1].to_dict()
        placeholder["date"] = next_day
        placeholder["units"] = np.nan
        placeholder["observation"] = "missing"
        placeholder["order_count"] = 0
        work = pd.concat([work, pd.DataFrame([placeholder])], ignore_index=True)
        featured = _features_for_series(work)
        row = featured.iloc[-1][FEATURE_COLUMNS].to_numpy(dtype=float)
        value = max(0.0, float(regressor.predict(row.reshape(1, -1))[0]))
        predicted.append(value)
        work.loc[work.index[-1], "units"] = value
        work.loc[work.index[-1], "observation"] = "sale"
    return np.asarray(predicted, dtype=float)


def train_forecast_model(payload: dict[str, Any], artifact_root: str) -> dict[str, Any]:
    errors = validate_dataset(payload)
    if errors:
        raise ValueError("; ".join(errors[:8]))
    frame = add_features(build_frame(payload))
    fit_end, select_end, weak = _split_dates(frame)
    trainable = frame["observation"].isin(["sale", "zero_filled"]) & (frame["date"] < fit_end)
    rows = frame.loc[trainable]
    regressor = new_regressor()
    if len(rows) >= 30:
        regressor.fit(
            rows[FEATURE_COLUMNS].to_numpy(dtype=float),
            pd.to_numeric(rows["units"]).to_numpy(dtype=float),
        )
    else:
        weak = True
        constant = float(pd.to_numeric(rows["units"], errors="coerce").mean()) if len(rows) else 0.0
        regressor.fit(np.zeros((8, len(FEATURE_COLUMNS))), np.full(8, max(0.0, constant)))
    selections: dict[str, dict[str, str | bool]] = {}
    residuals: list[float] = []
    product_rows = frame[frame["entity_type"] == "product"]
    for entity_id, group in product_rows.groupby("entity_id"):
        series = history_array(group)
        ml_score, ml_residuals = _ml_mae(
            regressor, group, horizon=7, fit_end=fit_end, select_end=select_end
        )
        chosen = select_model(series, strategy="auto", horizon=7, ml_mae=ml_score)
        if weak:
            chosen["statistically_weak"] = True
            chosen["confidence"] = "low"
        selections[str(entity_id)] = chosen
        residuals.extend(ml_residuals)
    band = residual_band(np.asarray(residuals, dtype=float))
    statistical = score_models(
        history_array(product_rows[product_rows["entity_id"] == product_rows["entity_id"].iloc[0]])
    )
    metadata = {
        "dataset_fingerprint": dataset_fingerprint(payload),
        "dataset_label": str(payload.get("label") or "unlabeled"),
        "trained_at": date.today().isoformat(),
        "fit_end": fit_end,
        "select_end": select_end,
        "data_cutoff": str(frame["date"].max()),
        "statistically_weak": weak,
        "horizons": [7, 14, 30],
        "selections": selections,
        "uncertainty": band,
        "sample_backtest": statistical,
        "dependencies": {
            "numpy": version("numpy"),
            "pandas": version("pandas"),
            "scikit-learn": version("scikit-learn"),
        },
        "demand_basis": "sales_based_estimate",
    }
    path = save_artifact(artifact_root, regressor, metadata)
    metadata["artifact_path_name"] = path.name
    return metadata


def _future_dates(last_day: str, horizon: int) -> list[str]:
    start = date.fromisoformat(last_day)
    return [(start + timedelta(days=offset)).isoformat() for offset in range(1, horizon + 1)]


def forecast_frame(
    frame: pd.DataFrame,
    *,
    horizon: int,
    strategy: str,
    regressor: Any | None,
    metadata: dict[str, Any] | None,
    lead_time_days: int | None = None,
    stock_by_product: dict[str, float] | None = None,
) -> dict[str, Any]:
    if horizon not in HORIZONS:
        raise ValueError("Horizon must be 7, 14, or 30 days")
    featured = add_features(frame)
    band = (metadata or {}).get("uncertainty") or residual_band(np.asarray([]))
    forecasts: list[dict[str, Any]] = []
    insights: list[dict[str, Any]] = []
    stock = stock_by_product or {}
    for (entity_type, entity_id), group in featured.groupby(
        ["entity_type", "entity_id"], sort=False
    ):
        ordered = group.sort_values("date")
        series = history_array(ordered)
        stored = ((metadata or {}).get("selections") or {}).get(str(entity_id))
        if strategy == "auto" and isinstance(stored, dict) and stored.get("model"):
            chosen = stored
        else:
            chosen = select_model(series, strategy=strategy, horizon=horizon)
        model_name = str(chosen["model"])
        if model_name == "ml_regression" and regressor is not None:
            point = recursive_ml(regressor, ordered, horizon)
        elif model_name == "ml_regression":
            point = forecast_named("moving_average", series, horizon)
            chosen = {**chosen, "model": "moving_average", "fallback": "artifact_missing"}
            model_name = "moving_average"
        else:
            point = forecast_named(model_name, series, horizon)
        lower, upper = apply_band(point, band)
        dates = _future_dates(str(ordered["date"].iloc[-1]), horizon)
        item = {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "dates": dates,
            "predicted_units": [round(float(value), 4) for value in point],
            "lower_units": [round(float(value), 4) for value in lower],
            "upper_units": [round(float(value), 4) for value in upper],
            "model": model_name,
            "model_version": MODEL_VERSION,
            "confidence": chosen.get("confidence") or "low",
            "pattern": chosen.get("pattern") or "stable",
            "fallback": chosen.get("fallback") or "",
            "uncertainty_label": band.get("label"),
            "demand_basis": "sales_based_estimate",
        }
        forecasts.append(item)
        if entity_type == "product":
            finite = series[np.isfinite(series)]
            recent = float(np.mean(finite[-7:])) if finite.size else 0.0
            previous = float(np.mean(finite[-14:-7])) if finite.size >= 14 else 0.0
            direction = trend_direction(recent, previous)
            current = stock.get(str(entity_id))
            horizon_units = float(np.sum(point))
            reorder, note = reorder_quantity(
                horizon_units=horizon_units,
                stock=current,
                lead_time_days=lead_time_days,
                horizon_days=horizon,
            )
            insights.append(
                {
                    "entity_id": entity_id,
                    "current_stock": current,
                    "forecast_units": round(horizon_units, 4),
                    "days_remaining": days_of_stock(current, horizon_units / horizon),
                    "stockout_risk": stockout_risk(current, horizon_units),
                    "trend": direction,
                    "slow_moving": slow_moving(recent, direction),
                    "high_demand": direction == "up",
                    "reorder_quantity": reorder,
                    "reorder_note": note,
                    "model": model_name,
                    "confidence": chosen.get("confidence") or "low",
                }
            )
    return {
        "model_version": MODEL_VERSION,
        "trained_at": (metadata or {}).get("trained_at"),
        "data_cutoff": (metadata or {}).get("data_cutoff"),
        "dataset_label": (metadata or {}).get("dataset_label"),
        "statistically_weak": (metadata or {}).get("statistically_weak", True),
        "forecasts": forecasts,
        "insights": insights,
    }


def forecast_payload(
    payload: dict[str, Any],
    *,
    artifact_root: str,
    require_artifact: bool = True,
) -> dict[str, Any]:
    horizon = int(payload.get("horizon_days") or 14)
    strategy = str(payload.get("strategy") or "auto")
    series = payload.get("series")
    if not isinstance(series, list) or not series:
        raise ValueError("At least one series is required")
    if len(series) > MAX_BATCH:
        raise ValueError(f"Batch limit is {MAX_BATCH} series")
    if "artifact_path" in payload or "path" in payload:
        raise ValueError("Artifact paths are not accepted")
    regressor = None
    metadata: dict[str, Any] | None = None
    try:
        regressor, metadata = load_artifact(artifact_root)
    except (OSError, ValueError) as error:
        if require_artifact:
            raise ValueError("Forecast artifact is not available") from error
    rows: list[dict[str, Any]] = []
    stock: dict[str, float] = {}
    for entry in series:
        if not isinstance(entry, dict):
            raise ValueError("Series entries must be objects")
        entity_id = str(entry.get("entity_id") or "")
        entity_type = str(entry.get("entity_type") or "product")
        if entity_type not in {"product", "category", "store"} or not entity_id:
            raise ValueError("Series entity is invalid")
        if entry.get("current_stock") is not None:
            stock[entity_id] = float(entry["current_stock"])
        for point in entry.get("points") or []:
            rows.append(
                {
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "category_id": str(entry.get("category_id") or entity_id),
                    "date": str(point["date"])[:10],
                    "units": point.get("units"),
                    "order_count": int(point.get("order_count") or 0),
                    "revenue": point.get("revenue"),
                    "observation": str(point.get("observation") or "sale"),
                    "inventory_state": str(point.get("inventory_state") or "unknown"),
                    "active": True,
                }
            )
    frame = pd.DataFrame(rows)
    lead = payload.get("lead_time_days")
    return forecast_frame(
        frame,
        horizon=horizon,
        strategy=strategy,
        regressor=regressor,
        metadata=metadata,
        lead_time_days=int(lead) if isinstance(lead, int) else None,
        stock_by_product=stock,
    )

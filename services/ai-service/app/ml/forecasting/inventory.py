"""Inventory decision support. Forecasts are estimates, not purchase orders."""

from __future__ import annotations


def days_of_stock(stock: float | None, daily_demand: float) -> float | None:
    if stock is None or daily_demand <= 0:
        return None
    return round(max(0.0, stock) / daily_demand, 2)


def stockout_risk(stock: float | None, horizon_units: float) -> str:
    if stock is None:
        return "unknown"
    if horizon_units <= 0:
        return "low"
    if horizon_units > stock:
        return "high"
    if horizon_units > stock * 0.7:
        return "medium"
    return "low"


def trend_direction(recent: float, previous: float) -> str:
    if previous <= 0 and recent <= 0:
        return "insufficient"
    if previous <= 0:
        return "up"
    change = (recent - previous) / previous
    if change >= 0.1:
        return "up"
    if change <= -0.1:
        return "down"
    return "flat"


def slow_moving(recent_daily: float, trend: str) -> bool:
    return recent_daily < 0.2 and trend != "up"


def reorder_quantity(
    *,
    horizon_units: float,
    stock: float | None,
    lead_time_days: int | None,
    horizon_days: int,
    safety_stock: float = 0,
    incoming_units: float = 0,
) -> tuple[float | None, str]:
    if lead_time_days is None or lead_time_days <= 0:
        return None, "Lead time was not provided, so a reorder quantity is unavailable."
    if stock is None or horizon_days <= 0:
        return None, "Current stock is unavailable, so a reorder quantity is unavailable."
    daily = horizon_units / horizon_days
    needed = daily * lead_time_days + safety_stock
    quantity = max(0.0, needed - stock - incoming_units)
    return round(quantity, 2), (
        "Reorder suggestion uses forecast demand over the supplied lead time, "
        "optional safety stock, current stock, and known incoming units. "
        "It does not create a purchase order."
    )

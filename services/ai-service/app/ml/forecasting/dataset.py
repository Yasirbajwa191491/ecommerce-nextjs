"""Daily sales frames. Missing inventory history is never invented."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

import pandas as pd

from app.ml.forecasting.eligibility import sale_decision

OBSERVED_TARGETS = frozenset({"sale", "zero_filled"})


def parse_utc_date(value: str) -> date:
    text = value.strip()
    if "T" not in text:
        return date.fromisoformat(text[:10])
    parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.date()
    return parsed.astimezone(UTC).date()


def aggregate_order_lines(lines: list[dict[str, object]]) -> pd.DataFrame:
    """Collapse eligible order lines into one row per product and UTC day.

    Date basis is the UTC calendar date of paid_at, or created_at when paid_at
    is absent. The same line_id is counted once. Promotion gifts are excluded
    from net unit demand because they are not purchased demand.
    """

    seen: set[str] = set()
    rows: list[dict[str, object]] = []
    for line in lines:
        line_id = str(line.get("line_id") or "")
        if not line_id or line_id in seen:
            continue
        seen.add(line_id)
        eligible, _reason = sale_decision(
            status=str(line.get("status") or ""),
            payment_status=str(line.get("payment_status") or ""),
            payment_method=str(line.get("payment_method") or ""),
        )
        if not eligible:
            continue
        quantity = int(line.get("quantity") or 0)
        if quantity < 0:
            continue
        stamp = line.get("paid_at") or line.get("created_at")
        if not isinstance(stamp, str) or not stamp.strip():
            continue
        gift = bool(line.get("is_promotion_gift"))
        rows.append(
            {
                "product_id": str(line["product_id"]),
                "category_id": str(line.get("category_id") or "unknown"),
                "date": parse_utc_date(stamp),
                "units": 0 if gift else quantity,
                "order_id": str(line.get("order_id") or ""),
                "revenue": 0.0 if gift else float(line.get("line_total") or 0),
                "active": bool(line.get("active", True)),
            }
        )
    if not rows:
        return pd.DataFrame(
            columns=[
                "product_id",
                "category_id",
                "date",
                "units",
                "order_count",
                "revenue",
                "active",
            ]
        )
    frame = pd.DataFrame(rows)
    grouped = (
        frame.groupby(["product_id", "category_id", "date"], as_index=False)
        .agg(
            units=("units", "sum"),
            order_count=("order_id", "nunique"),
            order_ids=("order_id", lambda values: tuple(sorted(set(values)))),
            revenue=("revenue", "sum"),
            active=("active", "max"),
        )
        .sort_values(["product_id", "date"])
    )
    return grouped


def calendar_frame(
    sales: pd.DataFrame,
    *,
    as_of: date,
    stockout_days: dict[str, set[date]] | None = None,
    missing_days: dict[str, set[date]] | None = None,
    extra_products: list[dict[str, str]] | None = None,
) -> pd.DataFrame:
    """Fill each product from its first sale through as_of.

    Days with no sale inside that span are zero_filled and inventory_state
    unknown. They are sales-based zeros, not proof of zero demand. Explicit
    stockout or missing days are flagged and are not training targets.
    """

    stockouts = stockout_days or {}
    missing = missing_days or {}
    records: list[dict[str, object]] = []
    groups = [] if sales.empty else list(sales.groupby("product_id"))
    for product_id, group in groups:
        category_id = str(group["category_id"].iloc[-1])
        active = bool(group["active"].iloc[-1])
        indexed = {row.date: row for row in group.itertuples(index=False)}
        start = min(indexed)
        last_sale = max(indexed)
        day = start
        while day <= as_of:
            if day in missing.get(str(product_id), set()):
                observation = "missing"
                inventory = "unknown"
                units = float("nan")
                orders = 0
                revenue = float("nan")
            elif day in stockouts.get(str(product_id), set()):
                observation = "stockout"
                inventory = "out_of_stock"
                units = float("nan")
                orders = 0
                revenue = float("nan")
            elif not active and day > last_sale:
                observation = "discontinued"
                inventory = "unknown"
                units = float("nan")
                orders = 0
                revenue = float("nan")
            elif day in indexed:
                row = indexed[day]
                observation = "sale"
                inventory = "unknown"
                units = float(row.units)
                orders = int(row.order_count)
                revenue = float(row.revenue)
            else:
                observation = "zero_filled"
                inventory = "unknown"
                units = 0.0
                orders = 0
                revenue = 0.0
            records.append(
                {
                    "entity_type": "product",
                    "entity_id": str(product_id),
                    "category_id": category_id,
                    "date": day.isoformat(),
                    "units": units,
                    "order_count": orders,
                    "order_ids": indexed[day].order_ids
                    if day in indexed and hasattr(indexed[day], "order_ids")
                    else frozenset(),
                    "revenue": revenue,
                    "observation": observation,
                    "inventory_state": inventory,
                    "active": active,
                }
            )
            day += timedelta(days=1)
    known = (
        {str(product_id) for product_id in sales["product_id"].unique()}
        if not sales.empty
        else set()
    )
    for product in extra_products or []:
        product_id = product["product_id"]
        if product_id in known:
            continue
        start = date.fromisoformat(product.get("start") or as_of.isoformat())
        day = start
        while day <= as_of:
            records.append(
                {
                    "entity_type": "product",
                    "entity_id": product_id,
                    "category_id": product.get("category_id") or "unknown",
                    "date": day.isoformat(),
                    "units": 0.0,
                    "order_count": 0,
                    "revenue": 0.0,
                    "observation": "zero_filled",
                    "inventory_state": "unknown",
                    "active": product.get("active", "true") != "false",
                }
            )
            day += timedelta(days=1)
    return pd.DataFrame(records)


def aggregate_scopes(products: pd.DataFrame) -> pd.DataFrame:
    """Category and store totals use only sale and zero-filled product days."""

    if products.empty:
        return products
    usable = products[products["observation"].isin(OBSERVED_TARGETS)].copy()
    if "order_ids" not in usable:
        raise ValueError(
            "Distinct scope order counts require order identities; rebuild from order lines"
        )
    frames = [products]
    for entity_type, keys in (
        ("category", ["category_id", "date"]),
        ("store", ["date"]),
    ):
        if usable.empty:
            continue
        grouped = usable.groupby(keys, as_index=False).agg(
            units=("units", "sum"),
            revenue=("revenue", "sum"),
            order_count=(
                "order_ids",
                lambda values: len(
                    set().union(
                        *[
                            v if isinstance(v, (set, frozenset, tuple, list)) else set()
                            for v in values
                        ]
                    )
                ),
            ),
        )
        if entity_type == "category":
            grouped["entity_type"] = "category"
            grouped["entity_id"] = grouped["category_id"]
        else:
            grouped["entity_type"] = "store"
            grouped["entity_id"] = "store"
            grouped["category_id"] = "store"
        grouped["observation"] = "sale"
        grouped["inventory_state"] = "unknown"
        grouped["active"] = True
        frames.append(
            grouped[
                [
                    "entity_type",
                    "entity_id",
                    "category_id",
                    "date",
                    "units",
                    "order_count",
                    "revenue",
                    "observation",
                    "inventory_state",
                    "active",
                ]
            ]
        )
    return pd.concat(frames, ignore_index=True)

"""Deterministic synthetic demand. Metrics from this data are not store performance."""

from __future__ import annotations

from datetime import date, timedelta

import numpy as np

SEED = 19
START = date(2025, 10, 4)


def _day(offset: int) -> str:
    return (START + timedelta(days=offset)).isoformat() + "T00:00:00+00:00"


def _line(
    *,
    line_id: str,
    product_id: str,
    category_id: str,
    offset: int,
    quantity: int,
    status: str = "delivered",
    payment_status: str = "paid",
    payment_method: str = "stripe",
    active: bool = True,
    gift: bool = False,
) -> dict[str, object]:
    return {
        "line_id": line_id,
        "order_id": f"order-{line_id}",
        "product_id": product_id,
        "category_id": category_id,
        "status": status,
        "payment_status": payment_status,
        "payment_method": payment_method,
        "quantity": quantity,
        "line_total": float(quantity * 20),
        "paid_at": _day(offset),
        "created_at": _day(offset),
        "is_promotion_gift": gift,
        "active": active,
    }


def generate_synthetic_lines(days: int = 120) -> dict[str, object]:
    rng = np.random.default_rng(SEED)
    lines: list[dict[str, object]] = []
    counter = 0

    def add(product: str, category: str, offset: int, quantity: int, **kwargs: object) -> None:
        nonlocal counter
        counter += 1
        lines.append(
            _line(
                line_id=f"L{counter}",
                product_id=product,
                category_id=category,
                offset=offset,
                quantity=quantity,
                **kwargs,
            )
        )

    for offset in range(days):
        weekly = 4 + (2 if offset % 7 in {5, 6} else 0)
        add("p-stable", "audio", offset, int(weekly))
        add("p-up", "audio", offset, int(2 + offset / 20))
        add("p-down", "home", offset, max(1, int(8 - offset / 20)))
        if offset % 9 == 0:
            add("p-sparse", "home", offset, int(rng.integers(1, 4)))
        if offset >= 90:
            add("p-new", "office", offset, 3)
        if offset == 40:
            add("p-stable", "audio", offset, 40)
        if offset < 100:
            add("p-old", "office", offset, 2, active=False)
        if offset % 7 != 3:
            add("p-gap", "office", offset, 2)
        add("p-cod", "audio", offset, 1, payment_method="cod", status="shipped")

    add("p-stable", "audio", 10, 5, payment_status="failed", status="failed")
    add(
        "p-stable", "audio", 11, 5, payment_status="pending", status="pending", payment_method="cod"
    )
    add("p-stable", "audio", 12, 4, status="cancelled", payment_status="paid")
    add("p-stable", "audio", 13, 4, status="refunded", payment_status="refunded")
    add("p-stable", "audio", 14, 1, gift=True)
    add("p-stable", "audio", 15, 6)

    stockouts = {"p-gap": {_day(offset)[:10] for offset in range(30, 37)}}
    missing = {"p-sparse": {_day(20)[:10], _day(21)[:10]}}
    return {
        "label": "synthetic_not_store_performance",
        "seed": SEED,
        "days": days,
        "as_of": _day(days - 1)[:10],
        "lines": lines,
        "stockout_days": {key: sorted(values) for key, values in stockouts.items()},
        "missing_days": {key: sorted(values) for key, values in missing.items()},
        "demand_basis": "sales_based_estimate",
        "extra_products": [
            {
                "product_id": "p-zero",
                "category_id": "office",
                "start": _day(0)[:10],
                "active": "true",
            }
        ],
    }

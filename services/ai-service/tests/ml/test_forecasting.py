"""Dataset, feature, model, and backtest checks for demand forecasting."""

from datetime import date

import numpy as np
import pandas as pd

from app.ml.forecasting.backtest import origins, score_models
from app.ml.forecasting.dataset import aggregate_order_lines, calendar_frame
from app.ml.forecasting.eligibility import sale_decision
from app.ml.forecasting.features import add_features
from app.ml.forecasting.inventory import reorder_quantity, stockout_risk
from app.ml.forecasting.metrics import mae, mase, wape
from app.ml.forecasting.models import (
    croston_forecast,
    exponential_smoothing_forecast,
    moving_average_forecast,
    naive_forecast,
    seasonal_naive_forecast,
)
from app.ml.forecasting.selection import select_model
from app.ml.forecasting.service import build_frame, validate_dataset
from app.ml.forecasting.synthetic import generate_synthetic_lines
from app.ml.forecasting.uncertainty import apply_band, residual_band


def _line(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "line_id": "L1",
        "order_id": "O1",
        "product_id": "p1",
        "category_id": "audio",
        "status": "delivered",
        "payment_status": "paid",
        "payment_method": "stripe",
        "quantity": 2,
        "line_total": 40,
        "paid_at": "2026-01-02T23:30:00+00:00",
        "created_at": "2026-01-02T23:30:00+00:00",
        "is_promotion_gift": False,
        "active": True,
    }
    base.update(overrides)
    return base


def test_paid_stripe_and_cod_count_and_failures_do_not() -> None:
    assert sale_decision(status="confirmed", payment_status="paid", payment_method="stripe")[0]
    assert sale_decision(status="shipped", payment_status="paid", payment_method="cod")[0]
    assert not sale_decision(status="pending", payment_status="pending", payment_method="cod")[0]
    assert not sale_decision(status="failed", payment_status="failed", payment_method="stripe")[0]
    assert not sale_decision(status="cancelled", payment_status="paid", payment_method="stripe")[0]
    assert not sale_decision(status="refunded", payment_status="refunded", payment_method="stripe")[
        0
    ]


def test_duplicate_lines_and_gifts_do_not_inflate_units() -> None:
    lines = [
        _line(),
        _line(),
        _line(line_id="gift", is_promotion_gift=True, quantity=5),
        _line(line_id="refund", status="refunded", payment_status="refunded"),
    ]
    sales = aggregate_order_lines(lines)
    assert len(sales) == 1
    assert float(sales.iloc[0]["units"]) == 2
    assert sales.iloc[0]["date"] == date(2026, 1, 2)


def test_missing_days_are_not_silent_zeros() -> None:
    sales = aggregate_order_lines(
        [_line(paid_at="2026-01-01"), _line(line_id="L2", paid_at="2026-01-03")]
    )
    frame = calendar_frame(
        sales,
        as_of=date(2026, 1, 3),
        missing_days={"p1": {date(2026, 1, 2)}},
    )
    middle = frame[frame["date"] == "2026-01-02"].iloc[0]
    assert middle["observation"] == "missing"
    assert middle["units"] != middle["units"]


def test_lags_do_not_read_the_future() -> None:
    frame = pd.DataFrame(
        {
            "entity_type": ["product"] * 3,
            "entity_id": ["p"] * 3,
            "category_id": ["audio"] * 3,
            "date": ["2026-01-01", "2026-01-02", "2026-01-03"],
            "units": [1.0, 10.0, 100.0],
            "order_count": [1, 1, 1],
            "revenue": [1, 1, 1],
            "observation": ["sale", "sale", "sale"],
            "inventory_state": ["unknown"] * 3,
            "active": [True] * 3,
        }
    )
    featured = add_features(frame)
    assert featured.iloc[1]["lag_1"] == 1
    assert featured.iloc[2]["lag_1"] == 10
    assert featured.iloc[0]["day_of_week"] == 3


def test_models_are_nonnegative_and_deterministic() -> None:
    history = np.array([0, 2, 0, 4, 0, 1, 0], dtype=float)
    first = seasonal_naive_forecast(history, 7)
    second = seasonal_naive_forecast(history, 7)
    assert np.array_equal(first, second)
    for values in (
        naive_forecast(history, 3),
        moving_average_forecast(history, 3),
        exponential_smoothing_forecast(history, 3),
        croston_forecast(history, 3),
    ):
        assert np.all(values >= 0)


def test_backtest_origins_move_forward() -> None:
    found = origins(40, horizon=7, step=7, min_train=14)
    assert found == sorted(found)
    assert found[0] == 14
    scores = score_models(np.arange(40, dtype=float), horizon=7, min_train=14)
    assert scores["naive"]["windows"] == scores["moving_average"]["windows"]
    assert scores["naive"]["mae"] is not None


def test_zero_actuals_do_not_divide_by_zero() -> None:
    actual = np.zeros(4)
    predicted = np.ones(4)
    assert wape(actual, predicted) is None
    assert mase(actual, predicted, np.zeros(4)) is None
    assert mae(actual, predicted) == 1


def test_uncertainty_stays_nonnegative_and_hides_small_samples() -> None:
    band = residual_band(np.array([1, -1, 0.5]))
    assert band["label"] == "unavailable"
    lower, upper = apply_band(
        np.array([1.0, 0.0]),
        {"lower_offset": -5.0, "upper_offset": 2.0, "label": "empirical_residual_band"},
    )
    assert np.all(lower >= 0)
    assert np.all(upper >= lower)


def test_cold_start_uses_a_labeled_fallback() -> None:
    chosen = select_model(np.array([1.0, 2.0, 1.0]), strategy="auto", horizon=7)
    assert chosen["model"] == "naive"
    assert chosen["fallback"] == "insufficient_history"
    reorder, note = reorder_quantity(horizon_units=10, stock=4, lead_time_days=None, horizon_days=7)
    assert reorder is None
    assert "Lead time" in note
    assert stockout_risk(3, 5) == "high"


def test_synthetic_dataset_covers_required_patterns() -> None:
    payload = generate_synthetic_lines()
    errors = validate_dataset(payload)
    assert errors == []
    frame = build_frame(payload)
    products = set(frame.loc[frame["entity_type"] == "product", "entity_id"])
    assert {"p-stable", "p-sparse", "p-new", "p-zero", "p-old"} <= products
    assert "stockout" in set(frame["observation"])
    assert "missing" in set(frame["observation"])
    assert "discontinued" in set(frame["observation"])
    assert set(frame["entity_type"]) >= {"product", "category", "store"}


def test_private_fields_are_rejected() -> None:
    payload = {"lines": [_line(customer_email="a@example.com")]}
    assert validate_dataset(payload)

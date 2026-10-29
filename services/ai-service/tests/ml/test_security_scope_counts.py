from datetime import date

from app.ml.forecasting.dataset import aggregate_order_lines, aggregate_scopes, calendar_frame


def test_scope_counts_union_order_ids_without_changing_units_or_revenue():
    base = {
        "status": "delivered",
        "payment_status": "paid",
        "payment_method": "stripe",
        "paid_at": "2026-10-01T12:00:00Z",
        "quantity": 2,
        "line_total": 10.0,
        "order_id": "one-order",
        "active": True,
    }
    lines = [
        {**base, "line_id": "line-a", "product_id": "a", "category_id": "same"},
        {**base, "line_id": "line-b", "product_id": "b", "category_id": "same"},
        {**base, "line_id": "line-c", "product_id": "c", "category_id": "different"},
    ]
    # A duplicate line must not duplicate the order, revenue, or units.
    frame = aggregate_order_lines([*lines, lines[0]])
    scoped = aggregate_scopes(calendar_frame(frame, as_of=date(2026, 10, 1)))
    store = scoped[scoped.entity_type == "store"].iloc[0]
    assert store.order_count == 1
    assert store.units == 6
    assert store.revenue == 30
    category = scoped[(scoped.entity_type == "category") & (scoped.entity_id == "same")].iloc[0]
    assert category.order_count == 1
    assert category.units == 4
    assert category.revenue == 20
    assert set(scoped[scoped.entity_type == "product"].order_count) == {1}

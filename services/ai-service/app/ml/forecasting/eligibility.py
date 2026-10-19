"""Sales eligibility for forecasting extracts.

Stripe sales count when payment_status is paid and the order is in a fulfillment
status. Cash on delivery counts only after payment_status is paid, which this
store sets when an admin records COD payment. Pending, failed, expired,
cancelled, and refunded orders are not sales. Refunds are whole-order reversals;
there is no partial line-item refund record.
"""

from __future__ import annotations

ELIGIBLE_STATUSES = frozenset({"processing", "confirmed", "shipped", "delivered"})
EXCLUDED_STATUSES = frozenset({"pending", "cancelled", "refunded", "failed", "expired"})
PAID = "paid"


def sale_decision(
    *,
    status: str,
    payment_status: str,
    payment_method: str,
) -> tuple[bool, str]:
    normalized_status = status.strip().lower()
    normalized_payment = payment_status.strip().lower()
    normalized_method = payment_method.strip().lower()
    if normalized_status in EXCLUDED_STATUSES:
        return False, f"status_{normalized_status}"
    if normalized_payment != PAID:
        return False, f"payment_{normalized_payment or 'missing'}"
    if normalized_method not in {"stripe", "cod"}:
        return False, "payment_method"
    if normalized_status not in ELIGIBLE_STATUSES:
        return False, "status_unknown"
    return True, "eligible_paid_sale"

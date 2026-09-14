export type StripeChargeRefundView = {
  amount: number;
  amount_refunded: number;
  refunded?: boolean;
};

/** The app does not support partial refunds. Only a fully refunded charge is authoritative. */
export function isFullChargeRefund(charge: StripeChargeRefundView): boolean {
  if (charge.amount <= 0) return false;
  if (charge.refunded === true) return true;
  return charge.amount_refunded >= charge.amount;
}

export function isAlreadyRefundedStripeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("already been refunded") ||
    message.includes("charge_already_refunded") ||
    message.includes("has already been refunded")
  );
}

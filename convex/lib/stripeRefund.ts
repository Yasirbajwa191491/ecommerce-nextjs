export type StripeChargeRefundView = {
  amount: number;
  amount_refunded: number;
  refunded?: boolean;
};

/**
 * Dashboard/webhook refunds are only applied when Stripe reports a full charge refund.
 * App-initiated cancel/refund with a cancellation fee is a partial Stripe refund and is
 * recorded immediately by refundUnfulfillablePayment, so those webhooks are ignored here.
 */
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

/** Transient Stripe refund errors should fail the scheduled action so Convex retries it. */
export function shouldRetryAutomaticStripeRefund(error: unknown): boolean {
  return !isAlreadyRefundedStripeError(error);
}

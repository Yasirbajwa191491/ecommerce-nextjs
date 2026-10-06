export function buildStripeRefundIdempotencyKey(args: {
  orderId: string;
  paymentIntentId: string;
  amountCents?: number;
}): string {
  const amount = args.amountCents == null ? "full" : String(Math.round(args.amountCents));
  return `refund:${args.orderId}:${args.paymentIntentId}:${amount}`.slice(0, 255);
}

const MAX_DELAY_MS = 6 * 60 * 60 * 1000;

export const STRIPE_REFUND_LEASE_MS = 5 * 60 * 1000;

/** Convex scheduled actions are not retried. Callers persist this delay for a cron. */
export function stripeRefundRetryDelayMs(attemptsAfterFailure: number): number {
  const exponent = Math.min(Math.max(attemptsAfterFailure, 1), 8);
  return Math.min(MAX_DELAY_MS, 30_000 * 2 ** (exponent - 1));
}

export function planStripeRefundRetry(attemptsAfterFailure: number, now: number): number {
  return now + stripeRefundRetryDelayMs(attemptsAfterFailure);
}

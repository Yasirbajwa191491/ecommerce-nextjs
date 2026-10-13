import { describe, expect, it } from "vitest";

import {
  buildStripeRefundIdempotencyKey,
  planStripeRefundRetry,
  stripeRefundRetryDelayMs,
} from "./stripeRefundRetry";

describe("stripe refund retries", () => {
  it("keeps one idempotency key for the same order, payment, and amount", () => {
    const first = buildStripeRefundIdempotencyKey({
      orderId: "order_1",
      paymentIntentId: "pi_1",
      amountCents: 2500,
    });
    const replay = buildStripeRefundIdempotencyKey({
      orderId: "order_1",
      paymentIntentId: "pi_1",
      amountCents: 2500,
    });
    const differentAmount = buildStripeRefundIdempotencyKey({
      orderId: "order_1",
      paymentIntentId: "pi_1",
      amountCents: 1000,
    });
    expect(first).toBe(replay);
    expect(differentAmount).not.toBe(first);
  });

  it("schedules a later attempt instead of assuming the action is retried", () => {
    expect(stripeRefundRetryDelayMs(1)).toBe(30_000);
    expect(planStripeRefundRetry(3, 1_000)).toBe(1_000 + 120_000);
    expect(stripeRefundRetryDelayMs(20)).toBeLessThanOrEqual(6 * 60 * 60 * 1000);
  });
});

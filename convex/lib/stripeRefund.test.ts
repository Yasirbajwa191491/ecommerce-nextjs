import { describe, expect, it } from "vitest";

import { isAlreadyRefundedStripeError, isFullChargeRefund } from "./stripeRefund";

describe("stripe refund detection", () => {
  it("accepts a fully refunded charge", () => {
    expect(
      isFullChargeRefund({ amount: 5000, amount_refunded: 5000, refunded: true })
    ).toBe(true);
    expect(isFullChargeRefund({ amount: 5000, amount_refunded: 5000 })).toBe(true);
  });

  it("rejects partial refunds so inventory is not fully restored", () => {
    expect(
      isFullChargeRefund({ amount: 5000, amount_refunded: 2000, refunded: false })
    ).toBe(false);
  });

  it("rejects zero-amount charges", () => {
    expect(isFullChargeRefund({ amount: 0, amount_refunded: 0, refunded: true })).toBe(
      false
    );
  });

  it("detects already-refunded Stripe errors for idempotent retries", () => {
    expect(isAlreadyRefundedStripeError(new Error("Charge has already been refunded"))).toBe(
      true
    );
    expect(isAlreadyRefundedStripeError(new Error("card_declined"))).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import {
  calculateCancellationRefundBreakdown,
  cancellationFeePolicyText,
  parseCancellationRefundFeePercent,
} from "./cancellationFee";

describe("cancellation refund fee", () => {
  it("defaults invalid values to 10 percent", () => {
    expect(parseCancellationRefundFeePercent(undefined)).toBe(10);
    expect(parseCancellationRefundFeePercent("abc")).toBe(10);
  });

  it("allows a zero fee", () => {
    expect(parseCancellationRefundFeePercent("0")).toBe(0);
  });

  it("caps the fee at 100 percent", () => {
    expect(parseCancellationRefundFeePercent("150")).toBe(100);
  });

  it("deducts the fee from the refund amount", () => {
    expect(
      calculateCancellationRefundBreakdown({
        orderTotal: 100,
        feePercent: 10,
      })
    ).toEqual({
      feePercent: 10,
      feeAmount: 10,
      refundAmount: 90,
      refundAmountCents: 9000,
    });
  });

  it("refunds nothing when the fee is 100 percent", () => {
    const breakdown = calculateCancellationRefundBreakdown({
      orderTotal: 49.99,
      feePercent: 100,
    });
    expect(breakdown.refundAmount).toBe(0);
    expect(breakdown.refundAmountCents).toBe(0);
  });

  it("describes the live percent in policy copy", () => {
    expect(cancellationFeePolicyText(10)).toContain("10%");
    expect(cancellationFeePolicyText(0)).toContain("No cancellation");
  });
});

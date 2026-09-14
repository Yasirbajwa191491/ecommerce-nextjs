import { describe, expect, it } from "vitest";

import {
  parseCancellationReason,
  planOrderCancellation,
  resolveCancellationEligibility,
  shouldCancelOpenStripePayment,
  shouldInitiateStripeRefund,
  shouldReleaseStockOnCancel,
  wasOrderStockReleased,
} from "./orderCancellation";

describe("order cancellation", () => {
  it("allows cancellation before shipment", () => {
    expect(
      resolveCancellationEligibility({
        status: "confirmed",
        paymentMethod: "cod",
        paymentStatus: "pending",
      }).canCancel
    ).toBe(true);
  });

  it("blocks customer cancellation after processing", () => {
    expect(
      resolveCancellationEligibility(
        {
          status: "processing",
          paymentMethod: "cod",
          paymentStatus: "pending",
        },
        { audience: "customer" }
      ).canCancel
    ).toBe(false);
    expect(
      resolveCancellationEligibility(
        {
          status: "processing",
          paymentMethod: "stripe",
          paymentStatus: "paid",
        },
        { audience: "customer" }
      ).canCancel
    ).toBe(false);
  });

  it("lets customers cancel unpaid Stripe while pending", () => {
    expect(
      resolveCancellationEligibility(
        {
          status: "pending",
          paymentMethod: "stripe",
          paymentStatus: "pending",
        },
        { audience: "customer" }
      ).canCancel
    ).toBe(true);
  });

  it("lets admin cancel processing orders the customer cannot", () => {
    expect(
      resolveCancellationEligibility({
        status: "processing",
        paymentMethod: "stripe",
        paymentStatus: "paid",
      }).canCancel
    ).toBe(true);
  });

  it("blocks shipped and delivered orders", () => {
    expect(
      resolveCancellationEligibility({
        status: "shipped",
        paymentMethod: "stripe",
        paymentStatus: "paid",
      }).canCancel
    ).toBe(false);
    expect(
      resolveCancellationEligibility({
        status: "delivered",
        paymentMethod: "cod",
        paymentStatus: "paid",
      }).canCancel
    ).toBe(false);
  });

  it("uses stockReleasedAt as the only release marker", () => {
    expect(wasOrderStockReleased(undefined)).toBe(false);
    expect(wasOrderStockReleased(1_710_000_000_000)).toBe(true);
  });

  it("releases stock only once per cancellation", () => {
    expect(shouldReleaseStockOnCancel({})).toBe(true);
    expect(
      shouldReleaseStockOnCancel({
        stockReleasedAt: 1_710_000_000_000,
      })
    ).toBe(false);
    expect(
      shouldReleaseStockOnCancel({
        stockReleasedAt: undefined,
      })
    ).toBe(true);
  });

  it("requires stripe refund for paid card orders", () => {
    expect(
      shouldInitiateStripeRefund({
        paymentMethod: "stripe",
        paymentStatus: "paid",
      })
    ).toBe(true);
    expect(
      shouldInitiateStripeRefund({
        paymentMethod: "cod",
        paymentStatus: "pending",
      })
    ).toBe(false);
  });

  it("cancels open stripe payment for pending card orders", () => {
    expect(
      shouldCancelOpenStripePayment({
        paymentMethod: "stripe",
        paymentStatus: "pending",
      })
    ).toBe(true);
  });

  it("validates cancellation reasons", () => {
    expect(parseCancellationReason("changed_mind")).toBe("changed_mind");
    expect(parseCancellationReason("invalid")).toBeUndefined();
  });

  it("does not restore stock for uncommitted checkout orders", () => {
    expect(
      planOrderCancellation({
        status: "pending",
        paymentMethod: "cod",
        paymentStatus: "pending",
        stockReleasedAt: 1_710_000_000_000,
      }).releaseStock
    ).toBe(false);
    expect(
      planOrderCancellation({
        status: "pending",
        paymentMethod: "stripe",
        paymentStatus: "pending",
        stockReleasedAt: 1_710_000_000_000,
      }).releaseStock
    ).toBe(false);
  });

  it("keeps COD payment pending when the order is cancelled", () => {
    expect(
      planOrderCancellation({
        status: "pending",
        paymentMethod: "cod",
        paymentStatus: "pending",
      }).nextPaymentStatus
    ).toBe("pending");
  });
});

import { describe, expect, it } from "vitest";

import {
  parseCancellationReason,
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

  it("detects stock already released statuses", () => {
    expect(wasOrderStockReleased("cancelled")).toBe(true);
    expect(wasOrderStockReleased("confirmed")).toBe(false);
    expect(wasOrderStockReleased("confirmed", 1710000000000)).toBe(true);
  });

  it("releases stock only once per cancellation", () => {
    expect(
      shouldReleaseStockOnCancel({
        status: "pending",
      })
    ).toBe(true);
    expect(
      shouldReleaseStockOnCancel({
        status: "confirmed",
        stockReleasedAt: 1710000000000,
      })
    ).toBe(false);
    expect(
      shouldReleaseStockOnCancel({
        status: "cancelled",
      })
    ).toBe(false);
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
        status: "pending",
      })
    ).toBe(true);
  });

  it("validates cancellation reasons", () => {
    expect(parseCancellationReason("changed_mind")).toBe("changed_mind");
    expect(parseCancellationReason("invalid")).toBeUndefined();
  });
});

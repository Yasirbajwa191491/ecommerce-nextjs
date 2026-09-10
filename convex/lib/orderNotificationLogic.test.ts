import { describe, expect, it } from "vitest";

import {
  buildNotificationEventKey,
  buildOrderStatusEventKey,
  buildPaymentStatusEventKey,
  canRetryStripePayment,
  isPendingStripeOrder,
  resolveLateStripePaymentAction,
  resolveOrderStatusTransitionEvent,
  resolvePaymentTransitionEvent,
  shouldSkipConfirmedAfterPaymentSucceeded,
} from "./orderNotificationLogic";

describe("order notification logic", () => {
  it("creates deterministic event keys", () => {
    expect(buildNotificationEventKey("order123", "order.created")).toBe(
      "order:order123:order.created"
    );
    expect(buildOrderStatusEventKey("order123", "shipped")).toBe(
      "order:order123:status:shipped"
    );
    expect(buildPaymentStatusEventKey("order123", "paid")).toBe(
      "order:order123:payment:paid"
    );
  });

  it("maps COD order creation to order.created", () => {
    expect(
      resolveOrderStatusTransitionEvent("pending", "pending")
    ).toBeNull();
  });

  it("maps admin processing transition", () => {
    expect(resolveOrderStatusTransitionEvent("confirmed", "processing")).toBe(
      "order.processing"
    );
  });

  it("maps stripe payment success", () => {
    expect(
      resolvePaymentTransitionEvent({
        previousPaymentStatus: "pending",
        newPaymentStatus: "paid",
        paymentMethod: "stripe",
        previousOrderStatus: "pending",
        newOrderStatus: "confirmed",
      })
    ).toBe("payment.succeeded");
  });

  it("maps COD payment received", () => {
    expect(
      resolvePaymentTransitionEvent({
        previousPaymentStatus: "pending",
        newPaymentStatus: "paid",
        paymentMethod: "cod",
        previousOrderStatus: "pending",
        newOrderStatus: "pending",
      })
    ).toBe("payment.received");
  });

  it("skips duplicate confirmed push after stripe payment succeeded", () => {
    expect(
      shouldSkipConfirmedAfterPaymentSucceeded({
        event: "order.confirmed",
        paymentMethod: "stripe",
        paymentStatus: "paid",
      })
    ).toBe(true);
  });

  it("detects pending stripe orders for recovery", () => {
    expect(
      isPendingStripeOrder({
        paymentMethod: "stripe",
        paymentStatus: "pending",
        status: "pending",
      })
    ).toBe(true);
    expect(
      isPendingStripeOrder({
        paymentMethod: "stripe",
        paymentStatus: "paid",
        status: "confirmed",
      })
    ).toBe(false);
  });

  it("allows retry for pending, failed, and expired stripe orders", () => {
    expect(
      canRetryStripePayment({
        paymentMethod: "stripe",
        paymentStatus: "pending",
        status: "pending",
      })
    ).toBe(true);
    expect(
      canRetryStripePayment({
        paymentMethod: "stripe",
        paymentStatus: "failed",
        status: "failed",
      })
    ).toBe(true);
    expect(
      canRetryStripePayment({
        paymentMethod: "stripe",
        paymentStatus: "failed",
        status: "expired",
      })
    ).toBe(true);
    expect(
      canRetryStripePayment({
        paymentMethod: "stripe",
        paymentStatus: "failed",
        status: "cancelled",
      })
    ).toBe(false);
  });

  it("re-reserves stock when a late Stripe payment arrives after expiry", () => {
    expect(
      resolveLateStripePaymentAction({
        paymentStatus: "failed",
        status: "expired",
      })
    ).toBe("rereserve_and_fulfill");
    expect(
      resolveLateStripePaymentAction({
        paymentStatus: "failed",
        status: "cancelled",
      })
    ).toBe("refund");
    expect(
      resolveLateStripePaymentAction({
        paymentStatus: "paid",
        status: "confirmed",
      })
    ).toBe("already_paid");
  });

  it("does not emit payment transition when unchanged", () => {
    expect(
      resolvePaymentTransitionEvent({
        previousPaymentStatus: "paid",
        newPaymentStatus: "paid",
        paymentMethod: "stripe",
        previousOrderStatus: "confirmed",
        newOrderStatus: "confirmed",
      })
    ).toBeNull();
  });
});

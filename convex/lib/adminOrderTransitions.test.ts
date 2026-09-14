import { describe, expect, it } from "vitest";

import {
  assertAdminRefundModeAllowed,
  canTransitionFulfillmentStatus,
  getSelectableAdminOrderStatuses,
  resolveAdminRefundPlan,
  resolveAdminStatusAction,
} from "./adminOrderTransitions";

describe("admin order status machine", () => {
  it("allows normal fulfillment transitions", () => {
    expect(canTransitionFulfillmentStatus("pending", "processing")).toBe(true);
    expect(canTransitionFulfillmentStatus("confirmed", "shipped")).toBe(true);
    expect(canTransitionFulfillmentStatus("shipped", "delivered")).toBe(true);
  });

  it("rejects shipping or delivering cancelled and refunded orders", () => {
    expect(resolveAdminStatusAction("cancelled", "shipped")).toEqual({
      type: "reject",
      message: "A cancelled order cannot be moved to shipped.",
    });
    expect(resolveAdminStatusAction("refunded", "delivered")).toEqual({
      type: "reject",
      message: "A refunded order cannot be moved to delivered.",
    });
    expect(resolveAdminStatusAction("expired", "delivered").type).toBe("reject");
    expect(resolveAdminStatusAction("failed", "shipped").type).toBe("reject");
  });

  it("routes cancelled and refunded through domain actions instead of a raw patch", () => {
    expect(resolveAdminStatusAction("confirmed", "cancelled")).toEqual({
      type: "cancel",
    });
    expect(resolveAdminStatusAction("confirmed", "refunded")).toEqual({
      type: "refund",
    });
  });

  it("does not let admin set failed or expired manually", () => {
    expect(resolveAdminStatusAction("pending", "failed").type).toBe("reject");
    expect(resolveAdminStatusAction("pending", "expired").type).toBe("reject");
  });

  it("hides illegal next statuses from the admin selector", () => {
    const cancelled = getSelectableAdminOrderStatuses({
      status: "cancelled",
      paymentMethod: "cod",
      paymentStatus: "pending",
    });
    expect(cancelled).toEqual(["cancelled"]);

    const pendingCod = getSelectableAdminOrderStatuses({
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "pending",
    });
    expect(pendingCod).toContain("cancelled");
    expect(pendingCod).not.toContain("refunded");
    expect(pendingCod).not.toContain("shipped");
  });
});

describe("admin refund confirmation", () => {
  it("lets admin refund paid Stripe with or without returning funds", () => {
    const plan = resolveAdminRefundPlan({
      status: "confirmed",
      paymentMethod: "stripe",
      paymentStatus: "paid",
      stripePaymentIntentId: "pi_123",
    });
    expect(plan.kind).toBe("stripe_paid");
    expect(assertAdminRefundModeAllowed(plan, "cod_manual").ok).toBe(false);
    expect(assertAdminRefundModeAllowed(plan, "stripe_original")).toEqual({
      ok: true,
    });
    expect(assertAdminRefundModeAllowed(plan, "without_payment")).toEqual({
      ok: true,
    });
  });

  it("records COD refunds without Stripe", () => {
    const plan = resolveAdminRefundPlan({
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "paid",
    });
    expect(plan.kind).toBe("cod_paid");
    expect(assertAdminRefundModeAllowed(plan, "stripe_original").ok).toBe(false);
    expect(assertAdminRefundModeAllowed(plan, "cod_manual")).toEqual({ ok: true });
  });

  it("does not refund unpaid orders and tells admin to cancel instead", () => {
    const plan = resolveAdminRefundPlan({
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "pending",
    });
    expect(plan.kind).toBe("unpaid_use_cancel");
  });

  it("cannot fake a Stripe refund when no payment intent exists", () => {
    const plan = resolveAdminRefundPlan({
      status: "confirmed",
      paymentMethod: "stripe",
      paymentStatus: "paid",
    });
    expect(plan.kind).toBe("cannot_refund");
  });
});

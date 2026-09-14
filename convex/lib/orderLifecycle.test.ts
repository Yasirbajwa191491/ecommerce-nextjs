import { describe, expect, it } from "vitest";

import { planOrderCancellation } from "./orderCancellation";
import { resolveLateStripePaymentAction } from "./orderNotificationLogic";

describe("order cancellation plan", () => {
  it("keeps unpaid COD pending and releases held stock once", () => {
    const plan = planOrderCancellation({
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "pending",
    });
    expect(plan.allowed).toBe(true);
    expect(plan.nextPaymentStatus).toBe("pending");
    expect(plan.releaseStock).toBe(true);
    expect(plan.initiateRefund).toBe(false);
    expect(plan.cancelOpenPayment).toBe(false);
  });

  it("uses the same plan for admin and customer cancellation of unpaid COD", () => {
    const customer = planOrderCancellation({
      status: "confirmed",
      paymentMethod: "cod",
      paymentStatus: "pending",
    });
    const admin = planOrderCancellation({
      status: "confirmed",
      paymentMethod: "cod",
      paymentStatus: "pending",
    });
    expect(customer).toEqual(admin);
    expect(admin.releaseStock).toBe(true);
  });

  it("initiates a real Stripe refund for paid card orders without flipping payment to failed", () => {
    const plan = planOrderCancellation({
      status: "confirmed",
      paymentMethod: "stripe",
      paymentStatus: "paid",
      stripePaymentIntentId: "pi_123",
    });
    expect(plan.initiateRefund).toBe(true);
    expect(plan.nextPaymentStatus).toBe("paid");
    expect(plan.releaseStock).toBe(true);
  });

  it("does not release stock twice when the inventory flag is already set", () => {
    const plan = planOrderCancellation({
      status: "cancelled",
      paymentMethod: "cod",
      paymentStatus: "pending",
      stockReleasedAt: 1_710_000_000_000,
    });
    expect(plan.isRepair).toBe(true);
    expect(plan.releaseStock).toBe(false);
  });

  it("repairs a cancelled order that never released stock", () => {
    const plan = planOrderCancellation({
      status: "cancelled",
      paymentMethod: "cod",
      paymentStatus: "pending",
    });
    expect(plan.allowed).toBe(true);
    expect(plan.isRepair).toBe(true);
    expect(plan.releaseStock).toBe(true);
  });

  it("does not deduct again when a late Stripe success arrives after cancel", () => {
    expect(
      resolveLateStripePaymentAction({
        paymentStatus: "failed",
        status: "cancelled",
      })
    ).toBe("refund");
    expect(
      resolveLateStripePaymentAction({
        paymentStatus: "pending",
        status: "cancelled",
      })
    ).toBe("refund");
  });

  it("re-holds stock for a legitimate retry after expiry or failure", () => {
    expect(
      resolveLateStripePaymentAction({
        paymentStatus: "failed",
        status: "expired",
      })
    ).toBe("rereserve_and_fulfill");
    expect(
      resolveLateStripePaymentAction({
        paymentStatus: "failed",
        status: "failed",
      })
    ).toBe("rereserve_and_fulfill");
  });

  it("does not treat PaymentSheet success as paid", () => {
    const pending = planOrderCancellation({
      status: "pending",
      paymentMethod: "stripe",
      paymentStatus: "pending",
    });
    expect(pending.nextPaymentStatus).toBe("failed");
    expect(pending.initiateRefund).toBe(false);
  });
});

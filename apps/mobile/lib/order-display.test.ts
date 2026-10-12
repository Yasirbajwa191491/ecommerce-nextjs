import { describe, expect, it } from "vitest";
import { canRetryStripePayment, getCheckoutSuccessTitle, getCheckoutSuccessMessage, getOrderProgressStepIndex, getOrderStatusLabel, getPaymentStatusLabel } from "./order-display";

describe("customer order and payment states", () => {
  it("shows received, placed and payment due for a new cash order", () => {
    const order = { status: "pending", paymentMethod: "cod", paymentStatus: "pending" };
    expect(getCheckoutSuccessTitle(order)).toBe("Order received");
    expect(getCheckoutSuccessMessage(order)).toContain("due when it arrives");
    expect(getOrderStatusLabel("pending")).toBe("Received");
    expect(getPaymentStatusLabel("pending", "cod")).toBe("Due on delivery");
    expect(getOrderProgressStepIndex("pending")).toBe(0);
    expect(canRetryStripePayment(order)).toBe(false);
  });
  it("keeps card payment confirmation distinct from store confirmation", () => {
    expect(getCheckoutSuccessTitle({ status: "pending", paymentMethod: "stripe", paymentStatus: "pending" })).toBe("Confirming payment");
    expect(getCheckoutSuccessTitle({ status: "pending", paymentMethod: "stripe", paymentStatus: "paid" })).toBe("Order received");
    expect(getCheckoutSuccessTitle({ status: "confirmed", paymentMethod: "stripe", paymentStatus: "paid" })).toBe("Order confirmed");
  });
  it.each(["cancelled", "refunded", "expired"] as const)("does not congratulate a terminal %s order", (status) => {
    expect(getCheckoutSuccessTitle({ status, paymentMethod: "cod", paymentStatus: "pending" })).not.toContain("confirmed");
    expect(getOrderProgressStepIndex(status)).toBe(-1);
  });
  it("marks all fulfillment stages progressively", () => {
    expect(getOrderProgressStepIndex("confirmed")).toBe(1);
    expect(getOrderProgressStepIndex("processing")).toBe(2);
    expect(getOrderProgressStepIndex("shipped")).toBe(3);
    expect(getOrderProgressStepIndex("delivered")).toBe(4);
    expect(getPaymentStatusLabel("pending", "cod", "cancelled")).toBe("No payment due");
  });
});

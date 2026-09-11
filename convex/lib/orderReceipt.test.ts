import { describe, expect, it } from "vitest";

import { resolveReceiptEligibility } from "./orderReceipt";

describe("order receipt eligibility", () => {
  it("marks pending stripe orders as provisional", () => {
    const result = resolveReceiptEligibility({
      status: "pending",
      paymentMethod: "stripe",
      paymentStatus: "pending",
    });
    expect(result.available).toBe(true);
    expect(result.kind).toBe("provisional");
  });

  it("provides final receipts for paid orders", () => {
    const result = resolveReceiptEligibility({
      status: "confirmed",
      paymentMethod: "stripe",
      paymentStatus: "paid",
    });
    expect(result.kind).toBe("final");
    expect(result.title).toBe("Order Receipt");
  });

  it("provides records for cancelled and refunded orders", () => {
    expect(
      resolveReceiptEligibility({
        status: "cancelled",
        paymentMethod: "cod",
        paymentStatus: "pending",
      }).kind
    ).toBe("record");
    expect(
      resolveReceiptEligibility({
        status: "refunded",
        paymentMethod: "stripe",
        paymentStatus: "refunded",
      }).kind
    ).toBe("record");
  });

  it("allows COD pending orders to have a receipt", () => {
    const result = resolveReceiptEligibility({
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "pending",
    });
    expect(result.available).toBe(true);
    expect(result.kind).toBe("final");
  });
});

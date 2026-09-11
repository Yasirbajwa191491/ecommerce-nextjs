import { describe, expect, it } from "vitest";

import { buildReceiptHtml, resolveReceiptActionLabels } from "./order-receipt-format";

const sampleReceipt = {
  storeName: "Test Store",
  storeEmail: "support@example.com",
  storePhone: "+1 555 0100",
  storeAddress: "123 Main St",
  orderNumber: "ORD-001",
  orderDate: Date.UTC(2026, 0, 15, 12, 0),
  paymentMethodLabel: "Card (Stripe)",
  paymentStatusLabel: "Paid",
  orderStatusLabel: "Confirmed",
  customerName: "Jane Doe",
  customerEmail: "jane@example.com",
  customerPhone: "+1 555 0199",
  customerAddress: "456 Oak Ave",
  items: [
    {
      productName: "Shirt",
      color: "Blue",
      quantity: 2,
      unitPrice: 25,
      lineTotal: 50,
      isPromotionGift: false,
    },
  ],
  subtotal: 50,
  discountTotal: 0,
  shipping: 5,
  tax: 4,
  total: 59,
  currency: "USD",
  receiptKind: "final" as const,
  receiptTitle: "Order Receipt",
  promotions: [],
};

describe("order receipt mobile", () => {
  it("builds html with order number and totals", () => {
    const html = buildReceiptHtml(sampleReceipt);
    expect(html).toContain("ORD-001");
    expect(html).toContain("Jane Doe");
    expect(html).toContain("$59.00");
  });

  it("uses provisional labels when payment is pending", () => {
    const labels = resolveReceiptActionLabels({
      ...sampleReceipt,
      receiptKind: "provisional",
      receiptTitle: "Order Summary",
    });
    expect(labels.downloadLabel).toBe("Download Summary");
  });
});

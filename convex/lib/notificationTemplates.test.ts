import { describe, expect, it } from "vitest";

import {
  buildOrderDeepLinkPath,
  buildOrderNotificationCopy,
  formatNotificationItemSummary,
} from "./notificationTemplates";

describe("notification deep links", () => {
  it("includes orderNumber search param on order detail links", () => {
    expect(buildOrderDeepLinkPath("ORD-20260101-ABC123", "order.confirmed")).toBe(
      "/order/ORD-20260101-ABC123?orderNumber=ORD-20260101-ABC123"
    );
  });

  it("sends payment recovery links to checkout success with orderNumber", () => {
    expect(buildOrderDeepLinkPath("ORD-20260101-ABC123", "payment.failed")).toBe(
      "/checkout/success?orderNumber=ORD-20260101-ABC123&pendingPayment=1"
    );
    expect(
      buildOrderDeepLinkPath("ORD-20260101-ABC123", "order.recovery.reminder")
    ).toBe("/checkout/success?orderNumber=ORD-20260101-ABC123&pendingPayment=1");
  });
});

describe("formatNotificationItemSummary", () => {
  it("formats a single item with quantity and color", () => {
    expect(
      formatNotificationItemSummary([
        { productName: "Laptop i7", quantity: 1, color: "Silver" },
      ])
    ).toBe("Laptop i7 (Silver)");
  });

  it("joins two items and summarizes extras", () => {
    expect(
      formatNotificationItemSummary([
        { productName: "Laptop i7", quantity: 1 },
        { productName: "Mouse", quantity: 2 },
        { productName: "Bag", quantity: 1 },
      ])
    ).toBe("Laptop i7, 2× Mouse +1 more");
  });

  it("prefers paid items over promotion gifts", () => {
    expect(
      formatNotificationItemSummary([
        { productName: "Free Gift", quantity: 1, isPromotionGift: true },
        { productName: "Laptop i7", quantity: 1 },
      ])
    ).toBe("Laptop i7");
  });
});

describe("recovery reminder copy", () => {
  it("reminds with item names instead of order number", () => {
    const copy = buildOrderNotificationCopy(
      "order.recovery.reminder",
      "ORD-20260919-TSQNZQ",
      {
        items: [
          { productName: "Laptop i7", quantity: 1 },
          { productName: "Wireless Mouse", quantity: 1 },
        ],
      }
    );

    expect(copy.title).toBe("Complete your order");
    expect(copy.body).toContain("Laptop i7");
    expect(copy.body).toContain("Wireless Mouse");
    expect(copy.body).not.toContain("ORD-20260919-TSQNZQ");
  });
});

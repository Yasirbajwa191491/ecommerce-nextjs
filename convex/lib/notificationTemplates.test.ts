import { describe, expect, it } from "vitest";

import { buildOrderDeepLinkPath } from "./notificationTemplates";

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

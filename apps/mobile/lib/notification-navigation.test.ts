import { describe, expect, it } from "vitest";

import { resolveNotificationHref } from "./notification-navigation";

describe("notification navigation", () => {
  it("maps payment recovery links to checkout success", () => {
    const href = resolveNotificationHref(
      "/checkout/success?orderNumber=ORD-123&pendingPayment=1",
      {
        customerEmail: "user@example.com",
        accessToken: "token-abc",
      }
    );

    expect(href).toEqual({
      pathname: "/checkout/success",
      params: {
        orderNumber: "ORD-123",
        pendingPayment: "1",
        customerEmail: "user@example.com",
        accessToken: "token-abc",
      },
    });
  });

  it("maps order links to the order detail screen", () => {
    const href = resolveNotificationHref("/order/ORD-456?orderNumber=ORD-456", {
      customerEmail: "user@example.com",
      accessToken: "token-abc",
    });

    expect(href).toEqual({
      pathname: "/order/[id]",
      params: {
        id: "ORD-456",
        orderNumber: "ORD-456",
        customerEmail: "user@example.com",
        accessToken: "token-abc",
      },
    });
  });
});

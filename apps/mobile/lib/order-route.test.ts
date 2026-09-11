import { describe, expect, it } from "vitest";

import { resolveRouteCustomerEmail, resolveRouteOrderNumber } from "./order-route";

describe("order route params", () => {
  it("prefers notification customerEmail over tracking email", () => {
    expect(
      resolveRouteCustomerEmail({
        customerEmail: "notify@example.com",
        email: "track@example.com",
      })
    ).toBe("notify@example.com");
  });

  it("falls back to tracking email when customerEmail is absent", () => {
    expect(resolveRouteCustomerEmail({ email: "track@example.com" })).toBe(
      "track@example.com"
    );
  });

  it("resolves order numbers from the order route", () => {
    expect(resolveRouteOrderNumber({ id: "ORD-456", orderNumber: "ORD-456" })).toBe(
      "ORD-456"
    );
  });
});

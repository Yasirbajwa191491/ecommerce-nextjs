import { describe, expect, it } from "vitest";

import { buildReceiptTrackUrl } from "./order-receipt-url";

describe("buildReceiptTrackUrl", () => {
  it("builds a deep link when site url is unavailable", () => {
    const previous = process.env.EXPO_PUBLIC_SITE_URL;
    delete process.env.EXPO_PUBLIC_SITE_URL;

    expect(buildReceiptTrackUrl("ORD-123")).toContain("ecommerce://order/ORD-123");

    if (previous) {
      process.env.EXPO_PUBLIC_SITE_URL = previous;
    }
  });
});

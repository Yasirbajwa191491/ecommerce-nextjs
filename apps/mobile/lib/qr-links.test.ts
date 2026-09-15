import { describe, expect, it } from "vitest";

import { parseQrPayload } from "./qr-links";

describe("mobile QR link parsing", () => {
  const token = "abcdefghijklmnopqrstuvwxyz0123456789ABCD";

  it("parses canonical HTTPS QR URLs", () => {
    expect(parseQrPayload(`https://store.example.com/qr/order/${token}`)).toEqual({
      type: "order",
      token,
    });
  });

  it("does not treat order-number tracking URLs as QR tokens", () => {
    expect(parseQrPayload("https://store.example.com/track-order/ORD-123")).toBeNull();
  });
});

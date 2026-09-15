import { describe, expect, it } from "vitest";

import { QR_PAYMENT_TTL_MS } from "./qrValidators";
import {
  buildQrPath,
  buildQrUrl,
  generateQrToken,
  hashQrToken,
  isQrTokenShape,
  parseQrPayload,
  parseQrUrl,
} from "./qrTokens";
import { paymentQrEligibility, paymentQrExpiresAt, resolveQrStatusCode } from "./qrCodes";

describe("qr tokens", () => {
  it("generates high-entropy tokens that are not order numbers", () => {
    const token = generateQrToken();
    expect(token.startsWith("ORD-")).toBe(false);
    expect(isQrTokenShape(token)).toBe(true);
    expect(token).not.toBe(generateQrToken());
  });

  it("hashes the same token consistently", async () => {
    const token = generateQrToken();
    expect(await hashQrToken(token)).toBe(await hashQrToken(token));
    expect(await hashQrToken(token)).not.toBe(await hashQrToken(`${token}x`));
  });

  it("builds canonical HTTPS QR URLs without order numbers", () => {
    const token = "abcdefghijklmnopqrstuvwxyz0123456789ABCD";
    expect(buildQrPath("order", token)).toBe(`/qr/order/${token}`);
    expect(buildQrUrl("order", token, "https://yourstore.com")).toBe(
      `https://yourstore.com/qr/order/${token}`
    );
    expect(buildQrUrl("order", token, "https://yourstore.com")).not.toContain("ORD-");
  });

  it("parses HTTPS, deep-link, and path QR payloads", () => {
    const token = "abcdefghijklmnopqrstuvwxyz0123456789ABCD";
    expect(parseQrUrl(`https://yourstore.com/qr/product/${token}`)).toEqual({
      type: "product",
      token,
    });
    expect(parseQrPayload(`ecommerce://qr/payment/${token}`)).toEqual({
      type: "payment",
      token,
    });
    expect(parseQrPayload("https://yourstore.com/track-order/ORD-123")).toBeNull();
    expect(parseQrPayload("ORD-2026-1042")).toBeNull();
  });
});

describe("qr eligibility", () => {
  it("treats pending stripe orders as payable", () => {
    expect(
      paymentQrEligibility({
        paymentMethod: "stripe",
        paymentStatus: "pending",
        status: "pending",
      } as never)
    ).toBe("ok");
  });

  it("rejects paid, cancelled, and COD orders", () => {
    expect(
      paymentQrEligibility({
        paymentMethod: "stripe",
        paymentStatus: "paid",
        status: "confirmed",
      } as never)
    ).toBe("already_paid");
    expect(
      paymentQrEligibility({
        paymentMethod: "stripe",
        paymentStatus: "pending",
        status: "cancelled",
      } as never)
    ).toBe("cancelled");
    expect(
      paymentQrEligibility({
        paymentMethod: "cod",
        paymentStatus: "pending",
        status: "pending",
      } as never)
    ).toBe("payment_unavailable");
  });

  it("marks expired QR records as expired", () => {
    const now = Date.now();
    expect(
      resolveQrStatusCode(
        { status: "active", expiresAt: now - 1 } as never,
        now
      )
    ).toBe("expired");
    expect(resolveQrStatusCode({ status: "revoked" } as never, now)).toBe("revoked");
    expect(paymentQrExpiresAt(now) - now).toBe(QR_PAYMENT_TTL_MS);
  });
});

describe("payment scan events", () => {
  it("defines distinct lifecycle events so initiation is not payment success", async () => {
    const { QR_SCAN_EVENTS } = await import("./qrValidators");
    expect(QR_SCAN_EVENTS).toContain("resolved");
    expect(QR_SCAN_EVENTS).toContain("payment_initiated");
    expect(QR_SCAN_EVENTS).toContain("payment_succeeded");
    expect(QR_SCAN_EVENTS).not.toContain("payment_success");
  });
});

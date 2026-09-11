import { describe, expect, it } from "vitest";

import { generateReceiptQrDataUrl } from "./order-receipt-qr";

describe("generateReceiptQrDataUrl", () => {
  it("returns a png data url", async () => {
    const dataUrl = await generateReceiptQrDataUrl("ORD-123");
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });
});

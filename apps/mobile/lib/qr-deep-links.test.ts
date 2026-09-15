import { describe, expect, it } from "vitest";

import { rewriteLegacyTrackOrderPath } from "./qr-deep-links";

describe("legacy track-order deep links", () => {
  it("rewrites track-order paths to the order screen with public tracking", () => {
    expect(rewriteLegacyTrackOrderPath("/track-order/ORD-123")).toBe(
      "/order/ORD-123?orderNumber=ORD-123&source=track"
    );
  });

  it("leaves QR paths unchanged", () => {
    expect(rewriteLegacyTrackOrderPath("/qr/order/abc")).toBe("/qr/order/abc");
  });
});

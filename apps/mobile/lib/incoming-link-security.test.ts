import { describe, expect, it } from "vitest";
import { isSafeIncomingLink, isStripeReturnLink } from "./incoming-link-security";
import { rewriteLegacyTrackOrderPath } from "./qr-deep-links";
const options = { siteUrl: "https://store.example.invalid" };
describe("incoming native link boundary", () => {
 it.each(["/order/fixture?accessToken=synthetic-capability", "ecommerce://checkout/stripe-redirect?payment_intent=fixture", "ecommerce://order/fixture", "https://store.example.invalid/track-order/ORD-1?accessToken=fixture", "/search?q=a%26b%3Dc", "/search?q=%E2%9C%93", "/search?q=%2525"])("preserves valid route %s", raw => expect(isSafeIncomingLink(raw, options)).toBe(true));
 it.each(["/search?q=%", "/search?q=%FF", "/search?q=%00", "/order/%0A", "/order/%5C", "/search?q=%C0%AF", "/search?q=%E0%A4%A", "/search?q=%25%", "/search?q=" + "x".repeat(9000), "/search?q=" + "x".repeat(2049), "/search?" + "x=1&".repeat(65), "//evil.invalid/order/1", "https://evil.invalid/order/1", "http://store.example.invalid/order/1", "ecommerce://user:password@order/1", "javascript:alert(1)", "/order/1\n", "/order\\1"])("rejects unsafe URI %s", raw => expect(isSafeIncomingLink(raw, options)).toBe(false));
 it("allows Expo development URLs only when explicitly in development", () => { expect(isSafeIncomingLink("exp://127.0.0.1:8081/--/", options)).toBe(false); expect(isSafeIncomingLink("exp://127.0.0.1:8081/--/", { development: true })).toBe(true); });
 it("matches payment return routes rather than attacker-chosen query text", () => { expect(isStripeReturnLink("ecommerce://stripe-redirect?fixture=1")).toBe(true); expect(isStripeReturnLink("ecommerce://checkout/stripe-redirect")).toBe(true); expect(isStripeReturnLink("/search?q=stripe-redirect")).toBe(false); });
 it("rewrites legacy order links while preserving capability/query/fragment", () => {
  expect(rewriteLegacyTrackOrderPath("ecommerce://track-order/ORD-1?accessToken=fixture#anchor")).toBe("/order/ORD-1?accessToken=fixture&orderNumber=ORD-1&source=track#anchor");
  expect(rewriteLegacyTrackOrderPath("/search?q=%2Ftrack-order%2FORD-1")).toBe("/search?q=%2Ftrack-order%2FORD-1");
 });
});

import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { redirectSystemPath } from "../app/+native-intent";
const callback = vi.hoisted(() => vi.fn());
vi.mock("@stripe/stripe-react-native", () => ({ handleURLCallback: callback }));
beforeEach(() => { vi.stubGlobal("__DEV__", false); vi.stubEnv("EXPO_PUBLIC_SITE_URL", "https://store.example.invalid"); callback.mockReset().mockResolvedValue(true); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("rejects unsafe incoming URLs before Stripe or Router can parse them", async () => {
 for (const path of ["ecommerce://checkout/stripe-redirect?x=%FF", "/search?q="+"%".repeat(9000), "https://evil.invalid/track-order/ORD-1"]) expect(await redirectSystemPath({ path, initial: true })).toBe("/");
 expect(callback).not.toHaveBeenCalled();
});
it("preserves Stripe returns without navigating away from checkout", async () => { expect(await redirectSystemPath({ path: "ecommerce://checkout/stripe-redirect?payment_intent=fixture", initial: false })).toBeNull(); expect(callback).toHaveBeenCalledTimes(1); });
it("keeps valid order recovery, auth, QR and encoded query routes", async () => {
 for (const path of ["ecommerce://order/recovered?accessToken=fixture", "ecommerce://auth/callback?token=fixture", "/qr/order/fixture", "/search?q=a%26b%3Dc"]) expect(await redirectSystemPath({ path, initial: false })).toBe(path);
 expect(callback).not.toHaveBeenCalled();
});
it("uses normal routing if native Stripe is unavailable and preserves legacy order capabilities", async () => {
 callback.mockRejectedValue(new Error("fixture native module unavailable"));
 expect(await redirectSystemPath({ path: "ecommerce://stripe-redirect", initial: false })).toBe("ecommerce://stripe-redirect");
 expect(await redirectSystemPath({ path: "ecommerce:///track-order/ORD-1?accessToken=fixture", initial: true })).toBe("/order/ORD-1?accessToken=fixture&orderNumber=ORD-1&source=track");
});

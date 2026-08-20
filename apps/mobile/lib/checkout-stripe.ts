import * as Linking from "expo-linking";

/** Deep-link URLs for Stripe Checkout return on mobile. */
export function getMobileStripeCheckoutUrls() {
  return {
    successUrl: `${Linking.createURL("checkout/success")}?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: Linking.createURL("checkout/cancel"),
    returnUrl: Linking.createURL("checkout"),
  };
}

export function parseCheckoutReturnUrl(url: string) {
  const parsed = Linking.parse(url);
  const path = parsed.path ?? "";

  if (path.includes("success")) {
    return { type: "success" as const };
  }
  if (path.includes("cancel")) {
    return { type: "cancel" as const };
  }
  return { type: "unknown" as const };
}

import * as Linking from "expo-linking";

/** Deep-link URLs for Stripe Checkout return on mobile. Order params are appended by Convex. */
export function getMobileStripeCheckoutUrls() {
  return {
    successUrl: Linking.createURL("checkout/success"),
    cancelUrl: Linking.createURL("checkout/cancel"),
    returnUrl: Linking.createURL("checkout"),
  };
}

export function parseCheckoutReturnUrl(url: string) {
  const parsed = Linking.parse(url);
  const path = parsed.path ?? "";
  const query = parsed.queryParams ?? {};

  const orderNumber =
    typeof query.orderNumber === "string" ? query.orderNumber : undefined;
  const accessToken =
    typeof query.accessToken === "string" ? query.accessToken : undefined;
  const sessionIdRaw = query.session_id ?? query.sessionId;
  const sessionId = typeof sessionIdRaw === "string" ? sessionIdRaw : undefined;

  if (path.includes("success")) {
    return { type: "success" as const, orderNumber, accessToken, sessionId };
  }
  if (path.includes("cancel")) {
    return { type: "cancel" as const, orderNumber, accessToken, sessionId };
  }
  return { type: "unknown" as const, orderNumber, accessToken, sessionId };
}

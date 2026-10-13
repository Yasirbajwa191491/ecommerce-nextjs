/** The mobile browser preview has no native Stripe PaymentSheet. */
export function getStripePublishableKey(): null { return null; }
export function requireStripePublishableKey(): never {
  throw new Error("Open the Android or iOS app to pay by card.");
}

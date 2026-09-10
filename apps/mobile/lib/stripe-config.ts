/** Stripe publishable key for PaymentSheet — never use secret keys here. */
export function getStripePublishableKey(): string | null {
  const key = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return key && key.startsWith("pk_") ? key : null;
}

export function requireStripePublishableKey(): string {
  const key = getStripePublishableKey();
  if (!key) {
    throw new Error(
      "Card payments are not configured. Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in apps/mobile/.env."
    );
  }
  return key;
}

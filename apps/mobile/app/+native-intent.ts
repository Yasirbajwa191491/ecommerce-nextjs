import { handleURLCallback } from "@stripe/stripe-react-native";

import { isSafeIncomingLink, isStripeReturnLink } from "@/lib/incoming-link-security";
import { rewriteLegacyTrackOrderPath } from "@/lib/qr-deep-links";

/**
 * Keep Stripe 3DS / bank-app return URLs from replacing the current Expo Router screen.
 * Returning null leaves the user on checkout so PaymentSheet can complete.
 */
export async function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): Promise<string | null> {
  if (!isSafeIncomingLink(path, { siteUrl: process.env.EXPO_PUBLIC_SITE_URL, development: __DEV__ })) return "/";
  try {
    if (isStripeReturnLink(path) && (await handleURLCallback(path))) {
      return null;
    }
  } catch {
    // Stripe native module is unavailable in Expo Go; fall through to normal routing.
  }

  try { return rewriteLegacyTrackOrderPath(path); } catch { return "/"; }
}

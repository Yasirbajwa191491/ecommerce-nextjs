import { handleURLCallback } from "@stripe/stripe-react-native";

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
  try {
    if (path.includes("stripe-redirect") && (await handleURLCallback(path))) {
      return null;
    }
  } catch {
    // Stripe native module is unavailable in Expo Go; fall through to normal routing.
  }

  return path;
}

import { StripeProvider as RNStripeProvider } from "@stripe/stripe-react-native";
import { ReactNode } from "react";

import { getStripePublishableKey } from "@/lib/stripe-config";

type StripeProviderProps = {
  children: ReactNode;
};

/**
 * Native Stripe SDK provider. Requires a development/EAS build — not Expo Go.
 * When the publishable key is missing, children still render; checkout shows a clear error.
 */
export function StripeProvider({ children }: StripeProviderProps) {
  const publishableKey = getStripePublishableKey();

  if (!publishableKey) {
    return <>{children}</>;
  }

  return (
    <RNStripeProvider publishableKey={publishableKey} urlScheme="ecommerce">
      <>{children}</>
    </RNStripeProvider>
  );
}

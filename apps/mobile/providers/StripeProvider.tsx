import { StripeProvider as RNStripeProvider, useStripe } from "@stripe/stripe-react-native";
import * as Linking from "expo-linking";
import { ReactNode, useEffect } from "react";

import { getStripePublishableKey } from "@/lib/stripe-config";

type StripeProviderProps = {
  children: ReactNode;
};

function StripeUrlCallbackHandler() {
  const { handleURLCallback } = useStripe();

  useEffect(() => {
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;
      try {
        await handleURLCallback(url);
      } catch {
        // Unrelated URLs and Expo Go missing-native-module cases should not crash the app.
      }
    };

    void Linking.getInitialURL().then((url) => {
      void handleDeepLink(url);
    });

    const subscription = Linking.addEventListener("url", (event) => {
      void handleDeepLink(event.url);
    });

    return () => subscription.remove();
  }, [handleURLCallback]);

  return null;
}

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
      <>
        <StripeUrlCallbackHandler />
        {children}
      </>
    </RNStripeProvider>
  );
}

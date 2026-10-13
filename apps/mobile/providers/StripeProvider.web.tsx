import type { ReactNode } from "react";

/** The browser preview can browse and use COD; PaymentSheet runs in the native app. */
export function StripeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

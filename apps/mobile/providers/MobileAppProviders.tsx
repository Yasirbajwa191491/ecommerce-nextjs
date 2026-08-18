import { ReactNode, useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppErrorBoundary } from "@/components/feedback/AppErrorBoundary";
import { installGlobalErrorHandlers } from "@/components/feedback/installGlobalErrorHandlers";
import { ToastBanner } from "@/components/feedback/ToastBanner";
import { hydrateVisitorId } from "@/lib/visitor-id";
import { CartProvider } from "@/providers/cart-context";
import { MobileConvexProvider } from "@/providers/MobileConvexProvider";
import { ToastProvider } from "@/providers/toast-context";

function VisitorIdHydrator({ children }: { children: ReactNode }) {
  useEffect(() => {
    void hydrateVisitorId();
  }, []);
  return <>{children}</>;
}

function GlobalErrorHandlers({ children }: { children: ReactNode }) {
  useEffect(() => {
    installGlobalErrorHandlers();
  }, []);
  return <>{children}</>;
}

export function MobileAppProviders({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary segment="root">
        <GlobalErrorHandlers>
          <MobileConvexProvider>
            <ToastProvider>
              <CartProvider>
                <VisitorIdHydrator>
                  {children}
                  <ToastBanner />
                </VisitorIdHydrator>
              </CartProvider>
            </ToastProvider>
          </MobileConvexProvider>
        </GlobalErrorHandlers>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}

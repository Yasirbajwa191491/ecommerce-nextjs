import { ReactNode, useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppErrorBoundary } from "@/components/feedback/AppErrorBoundary";
import { OfflineBanner } from "@/components/feedback/OfflineBanner";
import { installGlobalErrorHandlers } from "@/components/feedback/installGlobalErrorHandlers";
import { ToastBanner } from "@/components/feedback/ToastBanner";
import { hydrateVisitorId } from "@/lib/visitor-id";
import { CartProvider } from "@/providers/cart-context";
import { MobileConvexProvider } from "@/providers/MobileConvexProvider";
import { NetworkProvider } from "@/providers/NetworkProvider";
import { OfflineSyncBridge } from "@/providers/OfflineSyncBridge";
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
          <NetworkProvider>
            <MobileConvexProvider>
              <ToastProvider>
                <CartProvider>
                  <VisitorIdHydrator>
                    <OfflineSyncBridge />
                    {children}
                    <OfflineBanner />
                    <ToastBanner />
                  </VisitorIdHydrator>
                </CartProvider>
              </ToastProvider>
            </MobileConvexProvider>
          </NetworkProvider>
        </GlobalErrorHandlers>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}

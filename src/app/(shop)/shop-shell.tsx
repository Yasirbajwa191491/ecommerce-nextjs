"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AppProviders } from "@/providers/AppProviders";
import { VapiStorefrontControllerProvider } from "@/providers/vapi-storefront-controller";
import { VapiAssistantWidgetLoader } from "@/components/vapi/vapi-assistant-widget-loader";
import { ProductCompareSheet } from "@/components/products/product-compare-sheet";
import { useCartRecommendationSync } from "@/hooks/use-cart-recommendation-sync";
import { useVapiStorefrontController } from "@/providers/vapi-storefront-controller";

function CartRecommendationSync() {
  useCartRecommendationSync();
  return null;
}

function VapiStorefrontExtras() {
  const { compareProducts, compareSheetOpen, dismissCompareSheet } =
    useVapiStorefrontController();

  return (
    <ProductCompareSheet
      open={compareSheetOpen}
      onOpenChange={(open) => {
        if (!open) dismissCompareSheet();
      }}
      products={compareProducts}
    />
  );
}

export function ShopShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <VapiStorefrontControllerProvider>
        <div data-storefront className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <CartRecommendationSync />
          <VapiAssistantWidgetLoader />
          <VapiStorefrontExtras />
        </div>
      </VapiStorefrontControllerProvider>
    </AppProviders>
  );
}

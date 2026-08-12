"use client";

import { useCallback } from "react";
import { calculateFinalPrice } from "@/lib/pricing";
import { productPath } from "@/lib/product-url";
import type { CompareProductSummary } from "@/lib/vapi-ui-actions/types";
import type { Product } from "@/types/product";
import { useVapiStorefrontOptional } from "@/providers/vapi-storefront-controller";

const MAX_COMPARE = 4;

export function useProductCompare() {
  const storefront = useVapiStorefrontOptional();

  const addProduct = useCallback(
    (product: Product) => {
      if (!storefront) return;
      const summary: CompareProductSummary = {
        id: product._id,
        name: product.name,
        finalPrice: calculateFinalPrice(product.price, product.discountPercent ?? 0),
        currency: product.currency ?? "USD",
        rating: product.stars,
        reviewsCount: product.reviews,
        inStock: product.stock > 0,
        url: productPath(product._id),
      };
      const existing = storefront.compareProducts.filter((p) => p.id !== product._id);
      const next = [...existing, summary].slice(-MAX_COMPARE);
      storefront.applyUiAction({
        type: "compareProducts",
        productIds: next.map((p) => p.id),
        products: next,
      });
    },
    [storefront]
  );

  const isComparing = useCallback(
    (productId: string) =>
      storefront?.compareProducts.some((p) => p.id === productId) ?? false,
    [storefront?.compareProducts]
  );

  return {
    addProduct,
    isComparing,
    compareCount: storefront?.compareProducts.length ?? 0,
    openCompare: () => {
      if (storefront && storefront.compareProducts.length >= 2) {
        storefront.applyUiAction({
          type: "compareProducts",
          productIds: storefront.compareProducts.map((p) => p.id),
          products: storefront.compareProducts,
        });
      }
    },
  };
}

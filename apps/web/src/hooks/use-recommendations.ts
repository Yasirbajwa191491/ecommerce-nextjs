"use client";

import { useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api, type Id } from "@/lib/convex-api";
import {
  getCheckoutCustomerEmail,
  getVisitorId,
} from "@/lib/recommendations/visitor-id";
import type { RecommendationSectionType } from "@/lib/recommendations/section-copy";

export function useRecommendations({
  sectionType,
  productId,
  cartProductIds,
  recentlyViewedProductIds,
  limit = 8,
  enabled = true,
}: {
  sectionType: RecommendationSectionType;
  productId?: Id<"products">;
  cartProductIds?: Id<"products">[];
  recentlyViewedProductIds?: Id<"products">[];
  limit?: number;
  enabled?: boolean;
}) {
  const getRecommendations = useAction(api.recommendations.getRecommendations);
  const [productIds, setProductIds] = useState<Id<"products">[]>([]);
  const [cacheKey, setCacheKey] = useState<string | undefined>();
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const visitorId = getVisitorId();

    void getRecommendations({
      sectionType,
      visitorId,
      customerEmail: getCheckoutCustomerEmail(),
      productId,
      cartProductIds,
      recentlyViewedProductIds,
      limit,
    })
      .then((result: FunctionReturnType<typeof api.recommendations.getRecommendations>) => {
        if (!cancelled) {
          setProductIds(result.products.map((item) => item.productId));
          setCacheKey(result.cacheKey);
        }
      })
      .catch(() => {
        if (!cancelled) setProductIds([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    getRecommendations,
    sectionType,
    productId,
    cartProductIds,
    recentlyViewedProductIds,
    limit,
    enabled,
  ]);

  const products = useQuery(
    api.products.listByIds,
    productIds.length > 0 ? { ids: productIds } : "skip"
  );

  return {
    products,
    productIds,
    cacheKey,
    loading: loading || (productIds.length > 0 && products === undefined),
  };
}

import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";

import { getCachedVisitorId } from "@/lib/visitor-id";
import { api } from "@/lib/convex-api";
import type { Id } from "@convex/_generated/dataModel";

export type RecommendationSectionType =
  | "recommended_for_you"
  | "trending_in_interests"
  | "frequently_bought_together"
  | "customers_also_purchased";

export function useRecommendations({
  sectionType,
  productId,
  cartProductIds,
  limit = 8,
  enabled = true,
}: {
  sectionType: RecommendationSectionType;
  productId?: Id<"products">;
  cartProductIds?: Id<"products">[];
  limit?: number;
  enabled?: boolean;
}) {
  const getRecommendations = useAction(api.recommendations.getRecommendations);
  const [productIds, setProductIds] = useState<Id<"products">[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    const visitorId = getCachedVisitorId();

    void (async () => {
      if (!visitorId) {
        if (!cancelled) {
          setProductIds([]);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) setLoading(true);

      try {
        const result = await getRecommendations({
          sectionType,
          visitorId,
          productId,
          cartProductIds,
          limit,
        });
        if (!cancelled) {
          setProductIds(result.products.map((item) => item.productId));
        }
      } catch {
        if (!cancelled) setProductIds([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getRecommendations, sectionType, productId, cartProductIds, limit, enabled]);

  const products = useQuery(
    api.products.listByIds,
    productIds.length > 0 ? { ids: productIds } : "skip"
  );

  return {
    products: enabled ? products : undefined,
    productIds: enabled ? productIds : [],
    loading:
      enabled &&
      (loading || (productIds.length > 0 && products === undefined)),
    isEmpty: enabled && !loading && productIds.length === 0,
  };
}

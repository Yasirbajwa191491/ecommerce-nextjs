import { useAction, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { getIsOnline } from "@/lib/network";
import { useVisitorId } from "@/lib/visitor-id";
import { api } from "@/lib/convex-api";
import { offlineKeys } from "@/lib/offline/keys";
import { cacheProducts } from "@/lib/offline/product-store";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import type { Id } from "@convex/_generated/dataModel";
import type { Product } from "@/types/product";

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
  const visitorId = useVisitorId();
  const [productIds, setProductIds] = useState<Id<"products">[]>([]);
  const [loading, setLoading] = useState(enabled);
  const recsCacheKey = [
    offlineKeys.recommendations(sectionType),
    productId ?? "",
    (cartProductIds ?? []).slice().sort().join(","),
  ].join(":");
  const cachedIds = useOfflineCache<Id<"products">[]>(
    recsCacheKey,
    productIds.length > 0 ? productIds : undefined
  );
  const cachedIdsRef = useRef(cachedIds.data);

  useEffect(() => {
    cachedIdsRef.current = cachedIds.data;
  }, [cachedIds.data]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    void (async () => {
      if (!getIsOnline()) {
        if (!cancelled) {
          setProductIds(cachedIdsRef.current ?? []);
          setLoading(false);
        }
        return;
      }

      if (!visitorId) {
        if (!cancelled) {
          setProductIds(cachedIdsRef.current ?? []);
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
        if (!cancelled) {
          setProductIds(cachedIdsRef.current ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getRecommendations, sectionType, productId, cartProductIds, limit, enabled, visitorId]);

  const resolvedIds = productIds.length > 0 ? productIds : cachedIds.data ?? [];

  const products = useQuery(
    api.products.listByIds,
    enabled && resolvedIds.length > 0 && getIsOnline()
      ? { ids: resolvedIds }
      : "skip"
  );

  const cachedProducts = useOfflineCache<Product[]>(
    `${recsCacheKey}:products`,
    products
  );

  useEffect(() => {
    if (products && products.length > 0) {
      void cacheProducts(products);
    }
  }, [products]);

  const resolvedProducts = products ?? cachedProducts.data;
  const waitingForProducts =
    resolvedIds.length > 0 && resolvedProducts === undefined && getIsOnline();

  return {
    products: enabled ? resolvedProducts : undefined,
    productIds: enabled ? resolvedIds : [],
    loading: enabled && (loading || waitingForProducts),
    isEmpty:
      enabled &&
      !loading &&
      !waitingForProducts &&
      (resolvedProducts?.length ?? 0) === 0,
    fromCache: products === undefined && Boolean(cachedProducts.data),
  };
}

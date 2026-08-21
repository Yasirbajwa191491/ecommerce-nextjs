import { useAction } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { searchResultToProduct } from "@/lib/product-adapters";
import { api } from "@/lib/convex-api";
import { getIsOnline } from "@/lib/network";
import { offlineKeys } from "@/lib/offline/keys";
import { cacheProducts } from "@/lib/offline/product-store";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import type { Product } from "@/types/product";
import type { Id } from "@convex/_generated/dataModel";

export function useSimilarProducts(productId: Id<"products"> | undefined, limit = 8) {
  const getSimilar = useAction(api.productSearch.getSimilarProducts);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const cacheKey = productId ? offlineKeys.similar(productId) : `${offlineKeys.similar("none")}`;
  const cached = useOfflineCache<Product[]>(cacheKey, products.length > 0 ? products : undefined);
  const cachedRef = useRef(cached.data);

  useEffect(() => {
    cachedRef.current = cached.data;
  }, [cached.data]);

  useEffect(() => {
    if (!productId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      if (!getIsOnline()) {
        if (!cancelled) {
          setProducts(cachedRef.current ?? []);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) setLoading(true);

      try {
        const results = await getSimilar({ productId, limit });
        if (!cancelled) {
          const mapped = results.map(searchResultToProduct);
          setProducts(mapped);
          void cacheProducts(mapped);
        }
      } catch {
        if (!cancelled) setProducts(cachedRef.current ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getSimilar, productId, limit]);

  const resolved = useMemo(
    () => (products.length > 0 ? products : cached.data ?? []),
    [products, cached.data]
  );

  return useMemo(
    () => ({
      products: productId ? resolved : [],
      loading: productId ? loading && resolved.length === 0 : false,
      isEmpty: productId ? !loading && resolved.length === 0 : true,
    }),
    [resolved, loading, productId]
  );
}

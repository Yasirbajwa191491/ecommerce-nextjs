import { useAction } from "convex/react";
import { useEffect, useMemo, useState } from "react";

import { searchResultToProduct } from "@/lib/product-adapters";
import { api } from "@/lib/convex-api";
import type { Product } from "@/types/product";
import type { Id } from "@convex/_generated/dataModel";

export function useSimilarProducts(productId: Id<"products"> | undefined, limit = 8) {
  const getSimilar = useAction(api.productSearch.getSimilarProducts);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      if (!cancelled) setLoading(true);

      try {
        const results = await getSimilar({ productId, limit });
        if (!cancelled) {
          setProducts(results.map(searchResultToProduct));
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getSimilar, productId, limit]);

  return useMemo(
    () => ({
      products: productId ? products : [],
      loading: productId ? loading : false,
      isEmpty: productId ? !loading && products.length === 0 : true,
    }),
    [products, loading, productId]
  );
}

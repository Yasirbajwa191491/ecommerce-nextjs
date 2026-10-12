import { useAction } from "convex/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createSearchLifecycle } from "@ecommerce/shared";

import { productToSearchResult, searchResultToProduct, type SearchResultProduct } from "@/lib/product-adapters";
import { getCachedVisitorId, getSearchSessionId } from "@/lib/visitor-id";
import { api } from "@/lib/convex-api";
import { getIsOnline } from "@/lib/network";
import { cacheProducts } from "@/lib/offline/product-store";
import { searchCachedProducts } from "@/lib/offline/search-local";

export function useHybridProductSearch(debouncedQuery: string, limit = 12) {
  const searchHybrid = useAction(api.productSearch.searchHybrid);
  const [lifecycle] = useState(() => createSearchLifecycle<SearchResultProduct>());
  const [refreshVersion, setRefreshVersion] = useState(0);
  const state = useSyncExternalStore(lifecycle.subscribe, lifecycle.getSnapshot, lifecycle.getServerSnapshot);

  useEffect(() => {
    const query = debouncedQuery.trim();
    if (query.length < 2) {
      lifecycle.clear();
    } else {
      void lifecycle.start(async (cursor) => {
        if (!getIsOnline()) {
          const products = searchCachedProducts(query).map(productToSearchResult);
          return { products, totalCount: products.length, isSimilarFallback: false, error: products.length === 0 };
        }
        const sessionId = await getSearchSessionId();
        const result = await searchHybrid({
          query, limit, cursor, source: "header", sessionId,
          visitorId: getCachedVisitorId() || undefined,
        });
        void cacheProducts(result.products.map(searchResultToProduct)).catch(() => undefined);
        return result;
      });
    }
    return () => lifecycle.invalidate();
  }, [debouncedQuery, lifecycle, limit, searchHybrid, refreshVersion]);

  return {
    ...state,
    hasMore: state.nextCursor !== undefined,
    retry: () => setRefreshVersion((version) => version + 1),
    loadMore: () => getIsOnline() ? lifecycle.loadMore() : Promise.resolve(),
  };
}

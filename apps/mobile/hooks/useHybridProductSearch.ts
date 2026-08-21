import { useAction } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  productToSearchResult,
  searchResultToProduct,
  type SearchResultProduct,
} from "@/lib/product-adapters";
import { getCachedVisitorId, getSearchSessionId } from "@/lib/visitor-id";
import { api } from "@/lib/convex-api";
import { getIsOnline } from "@/lib/network";
import { cacheProducts } from "@/lib/offline/product-store";
import { searchCachedProducts } from "@/lib/offline/search-local";

type SearchState = {
  products: SearchResultProduct[];
  totalCount: number;
  loading: boolean;
  loadingMore: boolean;
  isSimilarFallback: boolean;
  error: boolean;
  nextCursor?: number;
};

export function useHybridProductSearch(debouncedQuery: string, limit = 12) {
  const searchHybrid = useAction(api.productSearch.searchHybrid);
  const [state, setState] = useState<SearchState>({
    products: [],
    totalCount: 0,
    loading: false,
    loadingMore: false,
    isSimilarFallback: false,
    error: false,
  });
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      return;
    }

    const requestId = ++requestIdRef.current;

    void (async () => {
      if (!getIsOnline()) {
        const cachedMatches = searchCachedProducts(trimmed).map(productToSearchResult);
        setState({
          products: cachedMatches,
          totalCount: cachedMatches.length,
          loading: false,
          loadingMore: false,
          isSimilarFallback: false,
          error: cachedMatches.length === 0,
          nextCursor: undefined,
        });
        return;
      }

      setState((prev) => ({
        ...prev,
        loading: true,
        error: false,
        products: [],
        totalCount: 0,
        isSimilarFallback: false,
        nextCursor: undefined,
      }));

      try {
        const sessionId = await getSearchSessionId();
        const result = await searchHybrid({
          query: trimmed,
          limit,
          cursor: 0,
          source: "header",
          sessionId,
          visitorId: getCachedVisitorId() || undefined,
        });
        if (requestId !== requestIdRef.current) return;
        void cacheProducts(result.products.map(searchResultToProduct));
        setState({
          products: result.products,
          totalCount: result.totalCount,
          loading: false,
          loadingMore: false,
          isSimilarFallback: result.isSimilarFallback,
          error: false,
          nextCursor: result.nextCursor,
        });
      } catch {
        if (requestId !== requestIdRef.current) return;
        setState({
          products: [],
          totalCount: 0,
          loading: false,
          loadingMore: false,
          isSimilarFallback: false,
          error: true,
        });
      }
    })();
  }, [debouncedQuery, limit, searchHybrid]);

  const loadMore = useCallback(async () => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2 || state.nextCursor === undefined || state.loadingMore) {
      return;
    }
    if (!getIsOnline()) {
      return;
    }

    setState((prev) => ({ ...prev, loadingMore: true }));
    try {
      const sessionId = await getSearchSessionId();
      const result = await searchHybrid({
        query: trimmed,
        limit,
        cursor: state.nextCursor,
        source: "header",
        sessionId,
        visitorId: getCachedVisitorId() || undefined,
      });
      setState((prev) => ({
        ...prev,
        products: [...prev.products, ...result.products],
        nextCursor: result.nextCursor,
        loadingMore: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, loadingMore: false }));
    }
  }, [debouncedQuery, limit, searchHybrid, state.nextCursor, state.loadingMore]);

  const trimmed = debouncedQuery.trim();
  const isActive = trimmed.length >= 2;

  return {
    products: isActive ? state.products : [],
    totalCount: isActive ? state.totalCount : 0,
    loading: isActive ? state.loading : false,
    loadingMore: isActive ? state.loadingMore : false,
    isSimilarFallback: isActive ? state.isSimilarFallback : false,
    error: isActive ? state.error : false,
    nextCursor: isActive ? state.nextCursor : undefined,
    hasMore: isActive && state.nextCursor !== undefined,
    loadMore,
  };
}

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
import type { Id } from "@convex/_generated/dataModel";

type CatalogHybridSearchState = {
  products: SearchResultProduct[];
  totalCount: number;
  loading: boolean;
  loadingMore: boolean;
  isSimilarFallback: boolean;
  error: boolean;
  nextCursor?: number;
  resultProductIds: Id<"products">[];
};

export function useCatalogHybridSearch(debouncedQuery: string, limit = 20, refreshVersion = 0, currency?: string) {
  const searchHybrid = useAction(api.productSearch.searchHybrid);
  const [state, setState] = useState<CatalogHybridSearchState>({
    products: [],
    totalCount: 0,
    loading: false,
    loadingMore: false,
    isSimilarFallback: false,
    error: false,
    resultProductIds: [],
  });
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 1) {
      queueMicrotask(() => {
        if (requestId !== requestIdRef.current) return;
        setState({
          products: [],
          totalCount: 0,
          loading: false,
          loadingMore: false,
          isSimilarFallback: false,
          error: false,
          resultProductIds: [],
        });
      });
      return;
    }

    void (async () => {
      if (!getIsOnline()) {
        const cachedMatches = searchCachedProducts(trimmed).map(productToSearchResult);
        if (requestId !== requestIdRef.current) return;
        setState({
          products: cachedMatches,
          totalCount: cachedMatches.length,
          loading: false,
          loadingMore: false,
          isSimilarFallback: false,
          error: cachedMatches.length === 0,
          resultProductIds: cachedMatches.map((item) => item._id),
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
        resultProductIds: [],
      }));

      try {
        const sessionId = await getSearchSessionId();
        const result = await searchHybrid({
          query: trimmed,
          currency,
          limit,
          cursor: 0,
          source: "catalog",
          sessionId,
          visitorId: getCachedVisitorId() || undefined,
        });
        if (requestId !== requestIdRef.current) return;
        void cacheProducts(result.products.map(searchResultToProduct)).catch(() => undefined);
        setState({
          products: result.products,
          totalCount: result.totalCount,
          loading: false,
          loadingMore: false,
          isSimilarFallback: result.isSimilarFallback,
          error: false,
          nextCursor: result.nextCursor,
          resultProductIds: result.resultProductIds as Id<"products">[],
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
          resultProductIds: [],
        });
      }
    })();
    return () => { requestIdRef.current += 1; };
  }, [debouncedQuery, limit, searchHybrid, refreshVersion, currency]);

  const loadMore = useCallback(async () => {
    const trimmed = debouncedQuery.trim();
    if (
      trimmed.length < 1 ||
      state.nextCursor === undefined ||
      state.loadingMore ||
      !getIsOnline()
    ) {
      return;
    }

    setState((prev) => ({ ...prev, loadingMore: true }));
    const requestId = requestIdRef.current;
    try {
      const sessionId = await getSearchSessionId();
      const result = await searchHybrid({
        query: trimmed,
        currency,
        limit,
        cursor: state.nextCursor,
        source: "catalog",
        sessionId,
        visitorId: getCachedVisitorId() || undefined,
      });
      if (requestId !== requestIdRef.current) return;
      setState((prev) => ({
        ...prev,
        products: [...prev.products, ...result.products],
        nextCursor: result.nextCursor,
        loadingMore: false,
      }));
    } catch {
      if (requestId !== requestIdRef.current) return;
      setState((prev) => ({ ...prev, loadingMore: false }));
    }
  }, [debouncedQuery, limit, searchHybrid, state.loadingMore, state.nextCursor, currency]);

  const trimmed = debouncedQuery.trim();
  const isActive = trimmed.length >= 1;

  return {
    products: isActive ? state.products : [],
    totalCount: isActive ? state.totalCount : 0,
    loading: isActive ? state.loading : false,
    loadingMore: isActive ? state.loadingMore : false,
    isSimilarFallback: isActive ? state.isSimilarFallback : false,
    error: isActive ? state.error : false,
    resultProductIds: isActive ? state.resultProductIds : [],
    hasMore: isActive && state.nextCursor !== undefined,
    loadMore,
  };
}

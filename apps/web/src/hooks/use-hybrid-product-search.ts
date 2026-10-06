"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { getSearchSessionId } from "@/lib/search/recent-searches";
import {
  getCheckoutCustomerEmail,
  getVisitorId,
} from "@/lib/recommendations/visitor-id";
import { mergeSearchPage } from "@ecommerce/shared";
import type { Id } from "@convex/_generated/dataModel";

export type CatalogSearchFilters = {
  categoryId?: Id<"productCategories">;
  minPrice?: number;
  maxPrice?: number;
  brands?: string[];
  colors?: string[];
  minRating?: number;
  promotions?: Array<
    "on_sale" | "discounted" | "bogo" | "free_gift" | "buy_x_get_y" | "limited_time"
  >;
  inStockOnly?: boolean;
};

export type HybridSearchProduct = {
  _id: string;
  name: string;
  company: string;
  imageUrl: string;
  images?: Array<{ url: string; alt?: string }>;
  price: number;
  discountPercent: number;
  currency: string;
  categoryId: string;
  categoryName: string;
  stars: number;
  reviews: number;
  featured: boolean;
  finalPrice: number;
  stock: number;
  shipping: boolean;
  description: string;
  _creationTime?: number;
};

type UseHybridProductSearchOptions = {
  debouncedQuery: string;
  limit?: number;
  source?: "header" | "catalog";
  enabled?: boolean;
};

type HybridSearchState = {
  products: HybridSearchProduct[];
  totalCount: number;
  loading: boolean;
  isSimilarFallback: boolean;
  nextCursor?: number;
  resultProductIds: string[];
};

export function useHybridProductSearch({
  debouncedQuery,
  limit = 8,
  source = "header",
  enabled = true,
}: UseHybridProductSearchOptions): HybridSearchState {
  const searchHybrid = useAction(api.productSearch.searchHybrid);
  const [state, setState] = useState<HybridSearchState>({
    products: [],
    totalCount: 0,
    loading: false,
    isSimilarFallback: false,
    resultProductIds: [],
  });
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = debouncedQuery.trim();
      if (!enabled || trimmed.length < 2) {
        setState({
          products: [],
          totalCount: 0,
          loading: false,
          isSimilarFallback: false,
          resultProductIds: [],
        });
        return;
      }

      const requestId = ++requestIdRef.current;
      setState({
        products: [],
        totalCount: 0,
        loading: true,
        isSimilarFallback: false,
        resultProductIds: [],
      });

      void searchHybrid({
        query: trimmed,
        limit,
        cursor: 0,
        source,
        sessionId: getSearchSessionId() || undefined,
        visitorId: getVisitorId() || undefined,
        customerKey: getCheckoutCustomerEmail(),
      })
        .then((result) => {
          if (requestId !== requestIdRef.current) return;
          setState({
            products: result.products,
            totalCount: result.totalCount,
            loading: false,
            isSimilarFallback: result.isSimilarFallback,
            nextCursor: result.nextCursor,
            resultProductIds: result.resultProductIds,
          });
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setState({
            products: [],
            totalCount: 0,
            loading: false,
            isSimilarFallback: false,
            resultProductIds: [],
          });
        });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [debouncedQuery, enabled, limit, searchHybrid, source]);

  return state;
}

export function useHybridProductSearchPaginated({
  debouncedQuery,
  limit = 12,
  source = "catalog",
  filters,
}: {
  debouncedQuery: string;
  limit?: number;
  source?: "header" | "catalog";
  filters?: CatalogSearchFilters;
}) {
  const searchHybrid = useAction(api.productSearch.searchHybrid);
  const [products, setProducts] = useState<HybridSearchProduct[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSimilarFallback, setIsSimilarFallback] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | undefined>();
  const [resultProductIds, setResultProductIds] = useState<string[]>([]);
  const requestIdRef = useRef(0);
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  });
  const filterKey = JSON.stringify(filters ?? {});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = debouncedQuery.trim();
      if (trimmed.length < 1) {
        setProducts([]);
        setTotalCount(0);
        setLoading(false);
        setIsSimilarFallback(false);
        setNextCursor(undefined);
        setResultProductIds([]);
        return;
      }

      const requestId = ++requestIdRef.current;
      setLoading(true);
      setProducts([]);
      setTotalCount(0);
      setIsSimilarFallback(false);
      setNextCursor(undefined);
      setResultProductIds([]);

      void searchHybrid({
        query: trimmed,
        limit,
        cursor: 0,
        source,
        sessionId: getSearchSessionId() || undefined,
        visitorId: getVisitorId() || undefined,
        customerKey: getCheckoutCustomerEmail(),
        ...filtersRef.current,
      })
        .then((result) => {
          const merged = mergeSearchPage({
            requestId,
            currentRequestId: requestIdRef.current,
            mode: "replace",
            previous: [],
            incoming: result.products,
          });
          if (!merged.applied) return;
          setProducts(merged.products);
          setTotalCount(result.totalCount);
          setIsSimilarFallback(result.isSimilarFallback);
          setNextCursor(result.nextCursor);
          setResultProductIds(result.resultProductIds);
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setProducts([]);
          setTotalCount(0);
          setIsSimilarFallback(false);
          setNextCursor(undefined);
          setResultProductIds([]);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) {
            setLoading(false);
          }
        });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [debouncedQuery, filterKey, limit, searchHybrid, source]);

  const loadMore = async () => {
    if (nextCursor === undefined || loadingMore) return;
    const requestId = requestIdRef.current;
    setLoadingMore(true);
    try {
      const result = await searchHybrid({
        query: debouncedQuery.trim(),
        limit,
        cursor: nextCursor,
        source,
        sessionId: getSearchSessionId() || undefined,
        visitorId: getVisitorId() || undefined,
        customerKey: getCheckoutCustomerEmail(),
        ...filtersRef.current,
      });
      if (requestId !== requestIdRef.current) return;
      setProducts((previous) =>
        mergeSearchPage({
          requestId,
          currentRequestId: requestIdRef.current,
          mode: "append",
          previous,
          incoming: result.products,
        }).products
      );
      setNextCursor(result.nextCursor);
      setResultProductIds(result.resultProductIds);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingMore(false);
      }
    }
  };

  return {
    products,
    totalCount,
    loading,
    loadingMore,
    isSimilarFallback,
    hasMore: nextCursor !== undefined,
    resultProductIds,
    loadMore,
  };
}

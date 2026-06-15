"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSearchSessionId } from "@/lib/search/recent-searches";

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
  });
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!enabled || trimmed.length < 2) {
      setState({
        products: [],
        totalCount: 0,
        loading: false,
        isSimilarFallback: false,
      });
      return;
    }

    const requestId = ++requestIdRef.current;
    setState({
      products: [],
      totalCount: 0,
      loading: true,
      isSimilarFallback: false,
    });

    void searchHybrid({
      query: trimmed,
      limit,
      cursor: 0,
      source,
      sessionId: getSearchSessionId() || undefined,
    })
      .then((result) => {
        if (requestId !== requestIdRef.current) return;
        setState({
          products: result.products,
          totalCount: result.totalCount,
          loading: false,
          isSimilarFallback: result.isSimilarFallback,
          nextCursor: result.nextCursor,
        });
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setState({
          products: [],
          totalCount: 0,
          loading: false,
          isSimilarFallback: false,
        });
      });
  }, [debouncedQuery, enabled, limit, searchHybrid, source]);

  return state;
}

export function useHybridProductSearchPaginated({
  debouncedQuery,
  limit = 12,
  source = "catalog",
}: {
  debouncedQuery: string;
  limit?: number;
  source?: "header" | "catalog";
}) {
  const searchHybrid = useAction(api.productSearch.searchHybrid);
  const [products, setProducts] = useState<HybridSearchProduct[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSimilarFallback, setIsSimilarFallback] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | undefined>();
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 1) {
      setProducts([]);
      setTotalCount(0);
      setLoading(false);
      setIsSimilarFallback(false);
      setNextCursor(undefined);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setProducts([]);
    setTotalCount(0);
    setIsSimilarFallback(false);
    setNextCursor(undefined);

    void searchHybrid({
      query: trimmed,
      limit,
      cursor: 0,
      source,
      sessionId: getSearchSessionId() || undefined,
    })
      .then((result) => {
        if (requestId !== requestIdRef.current) return;
        setProducts(result.products);
        setTotalCount(result.totalCount);
        setIsSimilarFallback(result.isSimilarFallback);
        setNextCursor(result.nextCursor);
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setProducts([]);
        setTotalCount(0);
        setIsSimilarFallback(false);
        setNextCursor(undefined);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      });
  }, [debouncedQuery, limit, searchHybrid, source]);

  const loadMore = async () => {
    if (nextCursor === undefined || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await searchHybrid({
        query: debouncedQuery.trim(),
        limit,
        cursor: nextCursor,
        source,
        sessionId: getSearchSessionId() || undefined,
      });
      setProducts((prev) => [...prev, ...result.products]);
      setNextCursor(result.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  return {
    products,
    totalCount,
    loading,
    loadingMore,
    isSimilarFallback,
    hasMore: nextCursor !== undefined,
    loadMore,
  };
}

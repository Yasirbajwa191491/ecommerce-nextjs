"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { getSearchSessionId } from "@/lib/search/recent-searches";
import {
  getCheckoutCustomerEmail,
  getVisitorId,
} from "@/lib/recommendations/visitor-id";
import { createSearchLifecycle } from "@ecommerce/shared";
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
  debouncedQuery, limit = 8, source = "header", enabled = true,
}: UseHybridProductSearchOptions): HybridSearchState {
  const searchHybrid = useAction(api.productSearch.searchHybrid);
  const [lifecycle] = useState(() => createSearchLifecycle<HybridSearchProduct>());
  const state = useSyncExternalStore(lifecycle.subscribe, lifecycle.getSnapshot, lifecycle.getServerSnapshot);

  useEffect(() => {
    const query = debouncedQuery.trim();
    if (!enabled || query.length < 2) {
      lifecycle.clear();
    } else {
      void lifecycle.start((cursor) => searchHybrid({
        query, limit, cursor, source,
        sessionId: getSearchSessionId() || undefined,
        visitorId: getVisitorId() || undefined,
        customerKey: getCheckoutCustomerEmail(),
      }));
    }
    return () => lifecycle.invalidate();
  }, [debouncedQuery, enabled, lifecycle, limit, searchHybrid, source]);

  return state;
}

export function useHybridProductSearchPaginated({
  debouncedQuery, limit = 12, source = "catalog", filters,
}: {
  debouncedQuery: string;
  limit?: number;
  source?: "header" | "catalog";
  filters?: CatalogSearchFilters;
}) {
  const searchHybrid = useAction(api.productSearch.searchHybrid);
  const [lifecycle] = useState(() => createSearchLifecycle<HybridSearchProduct>());
  const state = useSyncExternalStore(lifecycle.subscribe, lifecycle.getSnapshot, lifecycle.getServerSnapshot);
  const filterKey = JSON.stringify(filters ?? {});
  const searchFilters = useMemo(() => JSON.parse(filterKey) as CatalogSearchFilters, [filterKey]);

  useEffect(() => {
    const query = debouncedQuery.trim();
    if (!query) {
      lifecycle.clear();
    } else {
      void lifecycle.start((cursor) => searchHybrid({
        query, limit, cursor, source,
        sessionId: getSearchSessionId() || undefined,
        visitorId: getVisitorId() || undefined,
        customerKey: getCheckoutCustomerEmail(),
        ...searchFilters,
      }));
    }
    return () => lifecycle.invalidate();
  }, [debouncedQuery, lifecycle, limit, searchHybrid, searchFilters, source]);

  return { ...state, hasMore: state.nextCursor !== undefined, loadMore: lifecycle.loadMore };
}

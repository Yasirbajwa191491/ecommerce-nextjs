"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Id } from "../../convex/_generated/dataModel";
import type { ProductCategory } from "@/types/product";
import type { ProductSort } from "@/lib/shop/product-sort";
import {
  buildCatalogFilterSearchParams,
  parseCatalogFilters,
  type CatalogFilterState,
} from "@/lib/shop/catalog-filter-url";
import { useStableNow } from "@/hooks/use-stable-now";

export function useCatalogFilters(categories: ProductCategory[] | undefined) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = useStableNow();

  const filters = useMemo(
    () => parseCatalogFilters(searchParams),
    [searchParams]
  );

  const categoryId = useMemo((): Id<"productCategories"> | "all" => {
    if (!filters.categorySlug || !categories?.length) return "all";
    const match = categories.find(
      (category) => category.slug === filters.categorySlug
    );
    return match?._id ?? "all";
  }, [filters.categorySlug, categories]);

  const sort = filters.sort;

  const replaceFilters = useCallback(
    (next: Partial<CatalogFilterState>) => {
      const merged: CatalogFilterState = { ...filters, ...next };
      const params = buildCatalogFilterSearchParams(merged);
      const query = params.toString();
      router.replace(query ? `/products?${query}` : "/products", {
        scroll: false,
      });
    },
    [filters, router]
  );

  const setCategoryId = useCallback(
    (value: Id<"productCategories"> | "all") => {
      const slug =
        value === "all"
          ? ""
          : categories?.find((category) => category._id === value)?.slug ?? "";
      replaceFilters({ categorySlug: slug });
    },
    [categories, replaceFilters]
  );

  const setSort = useCallback(
    (value: ProductSort) => replaceFilters({ sort: value }),
    [replaceFilters]
  );

  const toggleBrand = useCallback(
    (slug: string) => {
      const normalized = slug.toLowerCase();
      const brandSlugs = filters.brandSlugs.includes(normalized)
        ? filters.brandSlugs.filter((entry) => entry !== normalized)
        : [...filters.brandSlugs, normalized];
      replaceFilters({ brandSlugs });
    },
    [filters.brandSlugs, replaceFilters]
  );

  const toggleColor = useCallback(
    (slug: string) => {
      const normalized = slug.toLowerCase();
      const colorSlugs = filters.colorSlugs.includes(normalized)
        ? filters.colorSlugs.filter((entry) => entry !== normalized)
        : [...filters.colorSlugs, normalized];
      replaceFilters({ colorSlugs });
    },
    [filters.colorSlugs, replaceFilters]
  );

  const togglePromotion = useCallback(
    (slug: string) => {
      const normalized = slug.toLowerCase();
      const promotionSlugs = filters.promotionSlugs.includes(normalized)
        ? filters.promotionSlugs.filter((entry) => entry !== normalized)
        : [...filters.promotionSlugs, normalized];
      replaceFilters({ promotionSlugs });
    },
    [filters.promotionSlugs, replaceFilters]
  );

  const setMinRating = useCallback(
    (value: number | undefined) => replaceFilters({ minRating: value }),
    [replaceFilters]
  );

  const setPriceRange = useCallback(
    (minPrice: number, maxPrice: number) =>
      replaceFilters({ minPrice, maxPrice }),
    [replaceFilters]
  );

  const clearPriceRange = useCallback(
    () => replaceFilters({ minPrice: undefined, maxPrice: undefined }),
    [replaceFilters]
  );

  const clearAllFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.search.trim()) {
      params.set("search", filters.search.trim());
    }
    const query = params.toString();
    router.replace(query ? `/products?${query}` : "/products", {
      scroll: false,
    });
  }, [filters.search, router]);

  return {
    filters,
    categoryId,
    sort,
    now,
    setCategoryId,
    setSort,
    toggleBrand,
    toggleColor,
    togglePromotion,
    setMinRating,
    setPriceRange,
    clearPriceRange,
    clearAllFilters,
    replaceFilters,
  };
}

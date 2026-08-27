import type { Id } from "@convex/_generated/dataModel";

export type CatalogSort =
  | "default"
  | "popular"
  | "newest"
  | "lowest"
  | "highest"
  | "rating"
  | "a-z"
  | "z-a";

export type PromotionFilterSlug =
  | "on_sale"
  | "discounted"
  | "bogo"
  | "free_gift"
  | "buy_x_get_y"
  | "limited_time";

export type CatalogFilterState = {
  categoryId?: Id<"productCategories">;
  brandSlugs: string[];
  colorSlugs: string[];
  promotionSlugs: PromotionFilterSlug[];
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort: CatalogSort;
  search: string;
};

export const DEFAULT_CATALOG_FILTERS: CatalogFilterState = {
  brandSlugs: [],
  colorSlugs: [],
  promotionSlugs: [],
  sort: "default",
  inStockOnly: false,
  search: "",
};

export function countActiveCatalogFilters(filters: CatalogFilterState): number {
  let count = 0;
  if (filters.categoryId) count += 1;
  if (filters.brandSlugs.length) count += filters.brandSlugs.length;
  if (filters.colorSlugs.length) count += filters.colorSlugs.length;
  if (filters.promotionSlugs.length) count += filters.promotionSlugs.length;
  if (filters.minRating !== undefined) count += 1;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count += 1;
  if (filters.inStockOnly) count += 1;
  return count;
}

export function clearAllCatalogFilters(
  filters: CatalogFilterState,
  options?: { preserveSearch?: boolean; preserveCategoryId?: boolean }
): CatalogFilterState {
  return {
    ...DEFAULT_CATALOG_FILTERS,
    search: options?.preserveSearch ? filters.search : "",
    categoryId: options?.preserveCategoryId ? filters.categoryId : undefined,
  };
}

export type PublicFilterQueryArgs = {
  now: number;
  productIds?: Id<"products">[];
  search?: string;
  categoryId?: Id<"productCategories">;
  minPrice?: number;
  maxPrice?: number;
  brands?: string[];
  colors?: string[];
  minRating?: number;
  promotions?: PromotionFilterSlug[];
  inStockOnly?: boolean;
  sort: CatalogSort;
};

export function hasActiveCatalogConstraints(filters: CatalogFilterState): boolean {
  return (
    countActiveCatalogFilters(filters) > 0 || filters.search.trim().length > 0
  );
}

export function toPublicFilterArgs(
  filters: CatalogFilterState,
  now: number,
  options?: {
    includeSearch?: boolean;
    fixedCategoryId?: Id<"productCategories">;
    productIds?: Id<"products">[];
  }
): PublicFilterQueryArgs {
  const categoryId = options?.fixedCategoryId ?? filters.categoryId;
  const useProductScope = options?.productIds !== undefined;
  return {
    now,
    productIds: useProductScope ? options.productIds : undefined,
    search:
      !useProductScope &&
      options?.includeSearch !== false &&
      filters.search.trim()
        ? filters.search.trim()
        : undefined,
    categoryId,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    brands: filters.brandSlugs.length ? filters.brandSlugs : undefined,
    colors: filters.colorSlugs.length ? filters.colorSlugs : undefined,
    minRating: filters.minRating,
    promotions: filters.promotionSlugs.length ? filters.promotionSlugs : undefined,
    inStockOnly: filters.inStockOnly || undefined,
    sort: filters.sort,
  };
}

export type FacetQueryArgs = Omit<PublicFilterQueryArgs, "sort"> & {
  productIds?: Id<"products">[];
};

export function toFacetArgs(
  filters: CatalogFilterState,
  now: number,
  options?: {
    isHybridSearch?: boolean;
    hybridProductIds?: Id<"products">[];
    fixedCategoryId?: Id<"productCategories">;
  }
): FacetQueryArgs {
  const base = toPublicFilterArgs(filters, now, {
    includeSearch: !options?.isHybridSearch,
    fixedCategoryId: options?.fixedCategoryId,
  });
  const { sort: _sort, ...facetBase } = base;
  return {
    ...facetBase,
    productIds:
      options?.isHybridSearch && options.hybridProductIds?.length
        ? options.hybridProductIds
        : undefined,
  };
}

export function toggleSlugList(list: string[], slug: string): string[] {
  return list.includes(slug) ? list.filter((entry) => entry !== slug) : [...list, slug];
}

export function togglePromotionSlug(
  list: PromotionFilterSlug[],
  slug: PromotionFilterSlug
): PromotionFilterSlug[] {
  return list.includes(slug) ? list.filter((entry) => entry !== slug) : [...list, slug];
}

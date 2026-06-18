import type { ProductSort } from "@/lib/shop/product-sort";

export type CatalogFilterState = {
  categorySlug: string;
  brandSlugs: string[];
  colorSlugs: string[];
  promotionSlugs: string[];
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  sort: ProductSort;
  search: string;
};

export function parseCatalogFilters(
  params: URLSearchParams
): CatalogFilterState {
  const ratingRaw = params.get("rating");
  const minRating = ratingRaw ? Number.parseInt(ratingRaw, 10) : undefined;
  const minPriceRaw = params.get("minPrice");
  const maxPriceRaw = params.get("maxPrice");

  return {
    search: params.get("search") ?? "",
    categorySlug: params.get("category") ?? "",
    brandSlugs: parseListParam(params.get("brand")),
    colorSlugs: parseListParam(params.get("color")),
    promotionSlugs: parseListParam(params.get("promotion")),
    minRating:
      minRating !== undefined && Number.isFinite(minRating) && minRating >= 1
        ? Math.min(5, minRating)
        : undefined,
    minPrice:
      minPriceRaw !== null && Number.isFinite(Number(minPriceRaw))
        ? Number(minPriceRaw)
        : undefined,
    maxPrice:
      maxPriceRaw !== null && Number.isFinite(Number(maxPriceRaw))
        ? Number(maxPriceRaw)
        : undefined,
    sort: parseSortParam(params.get("sort")),
  };
}

function parseListParam(value: string | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function parseSortParam(value: string | null): ProductSort {
  if (
    value === "lowest" ||
    value === "highest" ||
    value === "a-z" ||
    value === "z-a" ||
    value === "default"
  ) {
    return value;
  }
  return "default";
}

export function buildCatalogFilterSearchParams(
  filters: CatalogFilterState
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.categorySlug) {
    params.set("category", filters.categorySlug);
  }
  if (filters.brandSlugs.length) {
    params.set("brand", filters.brandSlugs.join(","));
  }
  if (filters.colorSlugs.length) {
    params.set("color", filters.colorSlugs.join(","));
  }
  if (filters.promotionSlugs.length) {
    params.set("promotion", filters.promotionSlugs.join(","));
  }
  if (filters.minRating !== undefined) {
    params.set("rating", String(filters.minRating));
  }
  if (filters.minPrice !== undefined) {
    params.set("minPrice", String(filters.minPrice));
  }
  if (filters.maxPrice !== undefined) {
    params.set("maxPrice", String(filters.maxPrice));
  }
  if (filters.sort !== "default") {
    params.set("sort", filters.sort);
  }

  return params;
}

export function catalogFiltersToPath(filters: CatalogFilterState): string {
  const params = buildCatalogFilterSearchParams(filters);
  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}

export function countActiveCatalogFilters(filters: CatalogFilterState): number {
  let count = 0;
  if (filters.categorySlug) count += 1;
  if (filters.brandSlugs.length) count += filters.brandSlugs.length;
  if (filters.colorSlugs.length) count += filters.colorSlugs.length;
  if (filters.promotionSlugs.length) count += filters.promotionSlugs.length;
  if (filters.minRating !== undefined) count += 1;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    count += 1;
  }
  return count;
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useHybridProductSearchPaginated } from "@/hooks/use-hybrid-product-search";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useCatalogFilters } from "@/hooks/use-catalog-filters";
import type { Product } from "@/types/product";
import type { ProductSort } from "@/lib/shop/product-sort";
import { calculateFinalPrice } from "@/lib/pricing";
import { ProductCatalogFilters } from "@/components/products/product-catalog-filters";
import { ProductCatalogMobileFilters } from "@/components/products/product-catalog-mobile-filters";
import { ProductCatalogToolbar } from "@/components/products/product-catalog-toolbar";
import { ProductCatalogLoadMore } from "@/components/products/product-catalog-load-more";
import { CatalogActiveFilters } from "@/components/products/catalog-active-filters";
import ProductCard from "@/components/products/ProductCard";
import { MotionSkeleton } from "@/components/motion";
import { ScrollReveal } from "@/components/home/scroll-reveal";
import { m } from "framer-motion";
import { fadeIn } from "@/lib/motion";
import { SHOP_BODY, SHOP_PAGE_LEAD, SHOP_PAGE_TITLE, SHOP_SUBSECTION_TITLE } from "@/lib/typography";
import { CONTENT_SECTION_PADDING_Y, PAGE_GUTTER } from "@/lib/layout-constants";
import { mapHybridSearchProductsToCatalog } from "@/lib/map-hybrid-search-product";
import { getPrimaryImageUrl, productCardKey } from "@/lib/product-images";
import { countActiveCatalogFilters } from "@/lib/shop/catalog-filter-url";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

type CatalogFilterFacets = FunctionReturnType<
  typeof api.products.getPublicFilterFacets
>;

/** Persists facet sidebar data across remounts so Brand/Promotions don't flash away. */
let catalogFacetsCache: CatalogFilterFacets | undefined;

function sortProductsClient(products: Product[], sort: ProductSort): Product[] {
  const sorted = [...products];
  switch (sort) {
    case "lowest":
      sorted.sort(
        (a, b) =>
          calculateFinalPrice(a.price, a.discountPercent ?? 0) -
          calculateFinalPrice(b.price, b.discountPercent ?? 0)
      );
      break;
    case "highest":
      sorted.sort(
        (a, b) =>
          calculateFinalPrice(b.price, b.discountPercent ?? 0) -
          calculateFinalPrice(a.price, a.discountPercent ?? 0)
      );
      break;
    case "a-z":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "z-a":
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    default:
      sorted.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      break;
  }
  return sorted;
}

function productListFingerprint(products: Product[]) {
  return products
    .map((product) => `${product._id}:${getPrimaryImageUrl(product, "")}`)
    .join(",");
}

export default function ProductCatalog() {
  const categories = useQuery(api.productCategories.listActive);
  const priceBounds = useQuery(api.products.getPublicPriceBounds);

  const {
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
    setPriceRange: setPriceRangeInUrl,
    clearPriceRange,
    clearAllFilters,
  } = useCatalogFilters(categories);

  const urlSearch = filters.search;
  const isHybridSearch = urlSearch.trim().length > 0;

  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(0);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const loadingMoreRef = useRef(false);
  const catalogSignatureRef = useRef("");
  const applyPriceImmediatelyRef = useRef(false);
  const [priceRange, setPriceRangeLocal] = useState<[number, number]>([0, 0]);
  const debouncedPriceRange = useDebouncedValue(priceRange, 400);
  const [priceInitialized, setPriceInitialized] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const facetNow = useMemo(
    () => Math.floor(now / 60_000) * 60_000,
    [now]
  );

  const facetArgs = useMemo(
    () => ({
      search: urlSearch.trim() || undefined,
      categoryId: categoryId === "all" ? undefined : categoryId,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      brands: filters.brandSlugs.length ? filters.brandSlugs : undefined,
      colors: filters.colorSlugs.length ? filters.colorSlugs : undefined,
      minRating: filters.minRating,
      promotions: filters.promotionSlugs.length
        ? (filters.promotionSlugs as Array<
            | "on_sale"
            | "discounted"
            | "bogo"
            | "free_gift"
            | "buy_x_get_y"
            | "limited_time"
          >)
        : undefined,
      now: facetNow,
    }),
    [urlSearch, categoryId, filters, facetNow]
  );

  const facetsQuery = useQuery(api.products.getPublicFilterFacets, facetArgs);
  if (facetsQuery !== undefined) {
    catalogFacetsCache = facetsQuery;
  }
  const facets = facetsQuery ?? catalogFacetsCache;

  useEffect(() => {
    if (!priceBounds) return;

    if (!priceInitialized) {
      const min = filters.minPrice ?? priceBounds.minPrice;
      const max = filters.maxPrice ?? priceBounds.maxPrice;
      setPriceRangeLocal([min, max]);
      setPriceInitialized(true);
      return;
    }

    setPriceRangeLocal((current) => [
      Math.min(current[0], priceBounds.minPrice),
      Math.max(current[1], priceBounds.maxPrice),
    ]);
  }, [priceBounds, priceInitialized, filters.minPrice, filters.maxPrice]);

  useEffect(() => {
    if (
      applyPriceImmediatelyRef.current &&
      debouncedPriceRange[0] === priceRange[0] &&
      debouncedPriceRange[1] === priceRange[1]
    ) {
      applyPriceImmediatelyRef.current = false;
    }
  }, [debouncedPriceRange, priceRange]);

  const activePriceRange = applyPriceImmediatelyRef.current
    ? priceRange
    : debouncedPriceRange;

  const priceFilterReady =
    priceInitialized &&
    activePriceRange[1] > activePriceRange[0] &&
    activePriceRange[1] > 0;

  useEffect(() => {
    if (!priceFilterReady || !priceBounds) return;
    const isDefaultRange =
      activePriceRange[0] === priceBounds.minPrice &&
      activePriceRange[1] === priceBounds.maxPrice;
    if (isDefaultRange) {
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        clearPriceRange();
      }
      return;
    }
    if (
      filters.minPrice !== activePriceRange[0] ||
      filters.maxPrice !== activePriceRange[1]
    ) {
      setPriceRangeInUrl(activePriceRange[0], activePriceRange[1]);
    }
  }, [
    activePriceRange,
    priceFilterReady,
    priceBounds,
    filters.minPrice,
    filters.maxPrice,
    setPriceRangeInUrl,
    clearPriceRange,
  ]);

  const handlePriceRangeChange = (range: [number, number]) => {
    setPriceRangeLocal(range);
  };

  const hybridSearch = useHybridProductSearchPaginated({
    debouncedQuery: urlSearch,
    limit: PAGE_SIZE,
    source: "catalog",
  });

  const hybridProductIds = useMemo(
    () => hybridSearch.products.map((product) => product._id as Id<"products">),
    [hybridSearch.products]
  );

  const hybridDisplayProducts = useMemo(() => {
    if (!isHybridSearch || hybridSearch.products.length === 0) {
      return [] as Product[];
    }

    const products = mapHybridSearchProductsToCatalog(hybridSearch.products);
    if (sort === "default") {
      const rankById = new Map(
        hybridProductIds.map((id, index) => [id, index])
      );
      return [...products].sort(
        (a, b) =>
          (rankById.get(a._id) ?? Number.MAX_SAFE_INTEGER) -
          (rankById.get(b._id) ?? Number.MAX_SAFE_INTEGER)
      );
    }
    return sortProductsClient(products, sort);
  }, [isHybridSearch, hybridSearch.products, hybridProductIds, sort]);

  const filterArgs = useMemo(
    () => ({
      search: urlSearch.trim() || undefined,
      categoryId: categoryId === "all" ? undefined : categoryId,
      minPrice:
        filters.minPrice ??
        (priceFilterReady ? activePriceRange[0] : undefined),
      maxPrice:
        filters.maxPrice ??
        (priceFilterReady ? activePriceRange[1] : undefined),
      brands: filters.brandSlugs.length ? filters.brandSlugs : undefined,
      colors: filters.colorSlugs.length ? filters.colorSlugs : undefined,
      minRating: filters.minRating,
      promotions: filters.promotionSlugs.length
        ? (filters.promotionSlugs as Array<
            | "on_sale"
            | "discounted"
            | "bogo"
            | "free_gift"
            | "buy_x_get_y"
            | "limited_time"
          >)
        : undefined,
      sort,
      now,
    }),
    [
      urlSearch,
      categoryId,
      activePriceRange,
      priceFilterReady,
      filters,
      sort,
      now,
    ]
  );

  const filterKey = useMemo(() => JSON.stringify(filterArgs), [filterArgs]);

  useEffect(() => {
    setPage(0);
    loadingMoreRef.current = false;
    catalogSignatureRef.current = "";
  }, [filterKey]);

  const totalCount = useQuery(
    api.products.countPublicFiltered,
    isHybridSearch ? "skip" : filterArgs
  );

  const firstPage = useQuery(
    api.products.listPublicPaginated,
    isHybridSearch
      ? "skip"
      : {
          paginationOpts: { numItems: PAGE_SIZE, cursor: null },
          ...filterArgs,
        }
  );

  const morePage = useQuery(
    api.products.listPublicPaginated,
    !isHybridSearch && page > 0
      ? {
          paginationOpts: {
            numItems: PAGE_SIZE,
            cursor: String(page * PAGE_SIZE),
          },
          ...filterArgs,
        }
      : "skip"
  );

  const remoteCatalogSignature = useMemo(() => {
    if (!firstPage || totalCount === undefined) return "";
    return `${totalCount}:${productListFingerprint(firstPage.page as Product[])}`;
  }, [firstPage, totalCount]);

  useEffect(() => {
    if (!firstPage || !remoteCatalogSignature) return;
    const firstBatch = firstPage.page as Product[];

    if (catalogSignatureRef.current !== remoteCatalogSignature) {
      catalogSignatureRef.current = remoteCatalogSignature;
      setPage(0);
      setAllProducts(firstBatch);
      loadingMoreRef.current = false;
      return;
    }

    setAllProducts((previous) => {
      if (page === 0 || previous.length === 0) {
        return firstBatch;
      }
      const updates = new Map(firstBatch.map((product) => [product._id, product]));
      return previous.map((product) => updates.get(product._id) ?? product);
    });
    loadingMoreRef.current = false;
  }, [firstPage, remoteCatalogSignature, page]);

  useEffect(() => {
    if (page === 0 || !morePage || !firstPage) return;

    loadingMoreRef.current = false;
    setAllProducts((previous) => {
      const firstBatch = firstPage.page as Product[];
      const base =
        previous.length >= firstBatch.length ? previous : firstBatch;
      const existingIds = new Set(base.map((product) => product._id));
      const nextItems = (morePage.page as Product[]).filter(
        (product) => !existingIds.has(product._id)
      );
      if (nextItems.length === 0) return base;
      return [...base, ...nextItems];
    });
  }, [morePage, page, firstPage]);

  const isSearchLoading = isHybridSearch && hybridSearch.loading;

  const isInitialLoading = isHybridSearch
    ? (categories === undefined ||
        priceBounds === undefined ||
        isSearchLoading) &&
      hybridDisplayProducts.length === 0
    : (categories === undefined ||
        priceBounds === undefined ||
        totalCount === undefined ||
        firstPage === undefined) &&
      allProducts.length === 0;

  const isRefetching = isHybridSearch
    ? isSearchLoading && hybridDisplayProducts.length > 0
    : firstPage === undefined && allProducts.length > 0 && !isInitialLoading;

  const isLoadingMore = isHybridSearch
    ? hybridSearch.loadingMore
    : page > 0 && morePage === undefined && allProducts.length > 0;

  const hasMore = useMemo(() => {
    if (isHybridSearch) return hybridSearch.hasMore;
    if (!firstPage || isInitialLoading) return false;
    if (page === 0) return !firstPage.isDone;
    if (morePage === undefined) return true;
    return !morePage.isDone;
  }, [
    isHybridSearch,
    hybridSearch.hasMore,
    firstPage,
    morePage,
    page,
    isInitialLoading,
  ]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || loadingMoreRef.current) return;
    if (isHybridSearch) {
      void hybridSearch.loadMore();
      return;
    }
    loadingMoreRef.current = true;
    setPage((current) => current + 1);
  }, [hasMore, isHybridSearch, isLoadingMore, hybridSearch]);

  useEffect(() => {
    if (isInitialLoading || isLoadingMore || loadingMoreRef.current || !hasMore) {
      return;
    }
    handleLoadMore();
  }, [hasMore, isInitialLoading, isLoadingMore, handleLoadMore, filterKey]);

  const sentinelRef = useInfiniteScroll({
    enabled: hasMore && !isLoadingMore && !isInitialLoading,
    onLoadMore: handleLoadMore,
  });

  const handleClear = () => {
    clearAllFilters();
    setPage(0);
    loadingMoreRef.current = false;

    if (priceBounds) {
      applyPriceImmediatelyRef.current = true;
      setPriceRangeLocal([priceBounds.minPrice, priceBounds.maxPrice]);
    }
  };

  const bounds = priceBounds ?? { minPrice: 0, maxPrice: 0 };

  const categoryName =
    categoryId === "all"
      ? undefined
      : categories?.find((category) => category._id === categoryId)?.name;

  const brandLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const brand of facets?.brands ?? []) {
      map[brand.slug] = brand.name;
    }
    return map;
  }, [facets?.brands]);

  const colorLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const color of facets?.colorFamilies ?? []) {
      map[color.slug] = color.name;
    }
    return map;
  }, [facets?.colorFamilies]);

  const promotionLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const promotion of facets?.promotions ?? []) {
      map[promotion.slug] = promotion.label;
    }
    return map;
  }, [facets?.promotions]);

  const activeFilterCount = countActiveCatalogFilters(filters);

  const showNoResults = isHybridSearch
    ? !isInitialLoading &&
      !isSearchLoading &&
      hybridSearch.totalCount === 0 &&
      hybridDisplayProducts.length === 0
    : !isInitialLoading &&
      !isRefetching &&
      firstPage !== undefined &&
      (totalCount ?? 0) === 0;

  const displayProducts = isHybridSearch ? hybridDisplayProducts : allProducts;
  const displayTotalCount = isHybridSearch
    ? hybridSearch.totalCount
    : (totalCount ?? 0);

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="border-b border-border/60 bg-background">
        <div
          className={cn("mx-auto w-full max-w-[1600px]", CONTENT_SECTION_PADDING_Y)}
          style={PAGE_GUTTER}
        >
          <ScrollReveal variant="headline">
            <h1 className={SHOP_PAGE_TITLE}>Ecommerce Products</h1>
            <p className={SHOP_PAGE_LEAD}>
              Browse our catalog — search from the header anytime.
            </p>
          </ScrollReveal>
        </div>
      </div>

      <div
        className={cn("mx-auto w-full max-w-[1600px]", CONTENT_SECTION_PADDING_Y)}
        style={PAGE_GUTTER}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] md:gap-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
          <ProductCatalogFilters
            categories={categories ?? []}
            categoryId={categoryId}
            onCategoryChange={setCategoryId}
            priceBounds={bounds}
            priceRange={priceRange}
            onPriceRangeChange={handlePriceRangeChange}
            facets={facets}
            selectedBrandSlugs={filters.brandSlugs}
            selectedColorSlugs={filters.colorSlugs}
            selectedPromotionSlugs={filters.promotionSlugs}
            selectedMinRating={filters.minRating}
            onToggleBrand={toggleBrand}
            onToggleColor={toggleColor}
            onTogglePromotion={togglePromotion}
            onSelectRating={setMinRating}
            onClear={handleClear}
            className="hidden md:sticky md:top-24 md:z-10 md:block md:self-start md:max-h-[calc(100vh-11rem)] md:overflow-y-auto md:overscroll-contain"
          />

          <section className="min-w-0">
            <ProductCatalogMobileFilters
              open={mobileFiltersOpen}
              onOpenChange={setMobileFiltersOpen}
              categories={categories ?? []}
              categoryId={categoryId}
              onCategoryChange={setCategoryId}
              priceBounds={bounds}
              priceRange={priceRange}
              onPriceRangeChange={handlePriceRangeChange}
              facets={facets}
              selectedBrandSlugs={filters.brandSlugs}
              selectedColorSlugs={filters.colorSlugs}
              selectedPromotionSlugs={filters.promotionSlugs}
              selectedMinRating={filters.minRating}
              onToggleBrand={toggleBrand}
              onToggleColor={toggleColor}
              onTogglePromotion={togglePromotion}
              onSelectRating={setMinRating}
              onClear={handleClear}
              activeFilterCount={activeFilterCount}
            />

            <div className="mb-4">
              <CatalogActiveFilters
                filters={filters}
                categoryName={categoryName}
                brandLabels={brandLabels}
                colorLabels={colorLabels}
                promotionLabels={promotionLabels}
                onClearAll={handleClear}
                onRemoveCategory={() => setCategoryId("all")}
                onToggleBrand={toggleBrand}
                onToggleColor={toggleColor}
                onTogglePromotion={togglePromotion}
                onClearRating={() => setMinRating(undefined)}
                onClearPrice={clearPriceRange}
              />
            </div>

            <ProductCatalogToolbar
              totalCount={displayTotalCount}
              searchQuery={urlSearch.trim() || undefined}
              isSearching={isSearchLoading}
              view={view}
              onViewChange={setView}
              sort={sort}
              onSortChange={(value: ProductSort) => setSort(value)}
            />

            {isHybridSearch && hybridSearch.isSimilarFallback ? (
              <div className="mb-4 rounded-xl border border-[#6254f3]/20 bg-[#6254f3]/5 px-4 py-3 sm:px-5 sm:py-4">
                <p className={SHOP_BODY}>
                  No exact matches for &ldquo;{urlSearch.trim()}&rdquo;. You may
                  be interested in these similar products.
                </p>
              </div>
            ) : null}

            {isInitialLoading ? (
              <div
                className={cn(
                  "grid",
                  view === "grid"
                    ? "auto-rows-fr grid-cols-1 items-stretch gap-4 sm:gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-6"
                    : "flex flex-col gap-3 sm:gap-4"
                )}
              >
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <MotionSkeleton
                    key={i}
                    shimmer
                    className={cn(
                      "rounded-2xl",
                      view === "list" ? "h-32" : "h-[18rem]"
                    )}
                  />
                ))}
              </div>
            ) : showNoResults ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-card px-6 py-20 text-center">
                <p className={SHOP_SUBSECTION_TITLE}>No products found</p>
                <p className={cn("mx-auto mt-3 max-w-lg", SHOP_BODY)}>
                  {urlSearch
                    ? `We couldn't find anything matching "${urlSearch}". Try a different search in the header or adjust your filters.`
                    : "Try adjusting your category or price filters."}
                </p>
              </div>
            ) : (
              <m.div
                className={cn(
                  isRefetching && "pointer-events-none opacity-60"
                )}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
              >
                <div
                  className={cn(
                    "grid",
                    view === "grid"
                      ? "auto-rows-fr grid-cols-1 items-stretch gap-4 sm:gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-6"
                      : "flex flex-col gap-3 sm:gap-4"
                  )}
                >
                  {displayProducts.map((product) => (
                    <ProductCard
                      key={productCardKey(product)}
                      {...product}
                      view={view}
                    />
                  ))}
                </div>

                <ProductCatalogLoadMore
                  sentinelRef={sentinelRef}
                  isLoadingMore={isLoadingMore || isRefetching}
                  hasMore={hasMore}
                  loadedCount={displayProducts.length}
                  view={view}
                />
              </m.div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

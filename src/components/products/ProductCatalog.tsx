"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import type { Product } from "@/types/product";
import type { ProductSort } from "@/lib/shop/product-sort";
import { ProductCatalogFilters } from "@/components/products/product-catalog-filters";
import { ProductCatalogToolbar } from "@/components/products/product-catalog-toolbar";
import { ProductCatalogLoadMore } from "@/components/products/product-catalog-load-more";
import ProductCard from "@/components/products/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

function productIds(products: Product[]) {
  return products.map((product) => product._id).join(",");
}

export default function ProductCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";

  const [categoryId, setCategoryId] = useState<
    Id<"productCategories"> | "all"
  >("all");
  const [sort, setSort] = useState<ProductSort>("default");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(0);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const loadingMoreRef = useRef(false);
  const catalogSignatureRef = useRef("");
  const applyPriceImmediatelyRef = useRef(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const debouncedPriceRange = useDebouncedValue(priceRange, 400);
  const [priceInitialized, setPriceInitialized] = useState(false);

  const categories = useQuery(api.productCategories.listActive);
  const priceBounds = useQuery(api.products.getPublicPriceBounds);

  useEffect(() => {
    if (!priceBounds) return;

    if (!priceInitialized) {
      setPriceRange([priceBounds.minPrice, priceBounds.maxPrice]);
      setPriceInitialized(true);
      return;
    }

    setPriceRange((current) => [
      Math.min(current[0], priceBounds.minPrice),
      Math.max(current[1], priceBounds.maxPrice),
    ]);
  }, [priceBounds, priceInitialized]);

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

  const filterArgs = useMemo(
    () => ({
      search: urlSearch.trim() || undefined,
      categoryId: categoryId === "all" ? undefined : categoryId,
      minPrice: priceFilterReady ? activePriceRange[0] : undefined,
      maxPrice: priceFilterReady ? activePriceRange[1] : undefined,
      sort,
    }),
    [urlSearch, categoryId, activePriceRange, priceFilterReady, sort]
  );

  const filterKey = useMemo(() => JSON.stringify(filterArgs), [filterArgs]);

  useEffect(() => {
    setPage(0);
    loadingMoreRef.current = false;
    catalogSignatureRef.current = "";
  }, [filterKey]);

  const totalCount = useQuery(api.products.countPublicFiltered, filterArgs);

  const firstPage = useQuery(api.products.listPublicPaginated, {
    paginationOpts: { numItems: PAGE_SIZE, cursor: null },
    ...filterArgs,
  });

  const morePage = useQuery(
    api.products.listPublicPaginated,
    page > 0
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
    return `${totalCount}:${productIds(firstPage.page as Product[])}`;
  }, [firstPage, totalCount]);

  useEffect(() => {
    if (!firstPage || !remoteCatalogSignature) return;

    if (catalogSignatureRef.current !== remoteCatalogSignature) {
      catalogSignatureRef.current = remoteCatalogSignature;
      setPage(0);
      setAllProducts(firstPage.page as Product[]);
      loadingMoreRef.current = false;
      return;
    }

    if (page === 0) {
      setAllProducts(firstPage.page as Product[]);
      loadingMoreRef.current = false;
    }
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

  const isInitialLoading =
    (categories === undefined ||
      priceBounds === undefined ||
      totalCount === undefined ||
      firstPage === undefined) &&
    allProducts.length === 0;

  const isRefetching =
    firstPage === undefined && allProducts.length > 0 && !isInitialLoading;

  const isLoadingMore =
    page > 0 && morePage === undefined && allProducts.length > 0;

  const hasMore = useMemo(() => {
    if (!firstPage || isInitialLoading) return false;
    if (page === 0) return !firstPage.isDone;
    if (morePage === undefined) return true;
    return !morePage.isDone;
  }, [firstPage, morePage, page, isInitialLoading]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setPage((current) => current + 1);
  }, [hasMore, isLoadingMore]);

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
    setCategoryId("all");
    setSort("default");
    setPage(0);
    loadingMoreRef.current = false;

    if (priceBounds) {
      applyPriceImmediatelyRef.current = true;
      setPriceRange([priceBounds.minPrice, priceBounds.maxPrice]);
    }

    if (urlSearch.trim()) {
      router.replace("/products");
    }
  };

  const bounds = priceBounds ?? { minPrice: 0, maxPrice: 0 };
  const showNoResults =
    !isInitialLoading &&
    !isRefetching &&
    firstPage !== undefined &&
    (totalCount ?? 0) === 0;

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="border-b border-border/60 bg-background">
        <div
          className="mx-auto w-full max-w-[1600px] py-4 sm:py-5"
          style={{
            paddingLeft: "clamp(1rem, 3vw, 3rem)",
            paddingRight: "clamp(1rem, 3vw, 3rem)",
          }}
        >
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Ecommerce Products
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse our catalog — search from the header anytime.
          </p>
        </div>
      </div>

      <div
        className="mx-auto w-full max-w-[1600px] py-5 lg:py-6"
        style={{
          paddingLeft: "clamp(1rem, 3vw, 3rem)",
          paddingRight: "clamp(1rem, 3vw, 3rem)",
        }}
      >
        <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-2 sm:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] sm:gap-3 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] md:gap-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
          <ProductCatalogFilters
            categories={categories ?? []}
            categoryId={categoryId}
            onCategoryChange={setCategoryId}
            priceBounds={bounds}
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
            onClear={handleClear}
            className="sticky top-[4.25rem] z-10 self-start max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain sm:top-[4.5rem] lg:top-24 lg:max-h-[calc(100vh-11rem)]"
          />

          <section className="min-w-0">
            <ProductCatalogToolbar
              totalCount={totalCount ?? 0}
              searchQuery={urlSearch.trim() || undefined}
              view={view}
              onViewChange={setView}
              sort={sort}
              onSortChange={setSort}
            />

            {isInitialLoading ? (
              <div
                className={cn(
                  "grid",
                  view === "grid"
                    ? "grid-cols-1 gap-1 sm:gap-1.5 md:grid-cols-2 2xl:grid-cols-3"
                    : "flex flex-col gap-3 sm:gap-4"
                )}
              >
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className={cn(
                      "rounded-2xl",
                      view === "list" ? "h-32" : "h-[22rem]"
                    )}
                  />
                ))}
              </div>
            ) : showNoResults ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-card px-6 py-20 text-center">
                <p className="text-xl font-semibold text-foreground">
                  No products found
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  {urlSearch
                    ? `We couldn't find anything matching "${urlSearch}". Try a different search in the header or adjust your filters.`
                    : "Try adjusting your category or price filters."}
                </p>
              </div>
            ) : (
              <div
                className={cn(
                  isRefetching && "pointer-events-none opacity-60"
                )}
              >
                <div
                  className={cn(
                    "grid",
                    view === "grid"
                      ? "grid-cols-1 gap-1 sm:gap-1.5 md:grid-cols-2 2xl:grid-cols-3"
                      : "flex flex-col gap-3 sm:gap-4"
                  )}
                >
                  {allProducts.map((product) => (
                    <ProductCard key={product._id} {...product} view={view} />
                  ))}
                </div>

                <ProductCatalogLoadMore
                  sentinelRef={sentinelRef}
                  isLoadingMore={isLoadingMore || isRefetching}
                  hasMore={hasMore}
                  loadedCount={allProducts.length}
                  view={view}
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

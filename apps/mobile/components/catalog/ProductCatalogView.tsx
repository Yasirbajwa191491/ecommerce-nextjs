import { usePaginatedQuery, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, ListRenderItem, Pressable, ScrollView, StyleSheet, Text, View, type ListRenderItemInfo, type ViewStyle } from "react-native";

import { CatalogActiveFilters } from "@/components/catalog/CatalogActiveFilters";
import {
  CatalogFiltersSheet,
  SORT_OPTIONS,
} from "@/components/catalog/CatalogFiltersSheet";
import { CachedDataNotice } from "@/components/feedback/CachedDataNotice";
import { EmptyState } from "@/components/feedback/EmptyState";
import { OfflineNotice } from "@/components/feedback/OfflineNotice";
import { MobileFooter } from "@/components/layout/MobileFooter";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductQuickViewSheet } from "@/components/products/ProductQuickViewSheet";
import { Chip } from "@/components/ui/Chip";
import { IconSegmentedControl } from "@/components/ui/SegmentedControl";
import { Button } from "@/components/ui/Button";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { SearchBarInput } from "@/components/ui/SearchBar";
import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";
import { useCatalogHybridSearch } from "@/hooks/useCatalogHybridSearch";
import { useCatalogLayout } from "@/hooks/useCatalogLayout";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useStableNow } from "@/hooks/useStableNow";
import {
  countActiveCatalogFilters,
  DEFAULT_CATALOG_FILTERS,
  hasActiveCatalogConstraints,
  toFacetArgs,
  toPublicFilterArgs,
  type CatalogFilterState,
} from "@/lib/catalog/filters";
import { api } from "@/lib/convex-api";
import { offlineKeys } from "@/lib/offline/keys";
import { MAX_CATEGORY_PRODUCTS } from "@/lib/offline/constants";
import type { HomeCategory } from "@/lib/offline/types";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import type { Product } from "@/types/product";
import type { Id } from "@convex/_generated/dataModel";

const PAGE_SIZE = 20;

export type ProductCatalogViewProps = {
  fixedCategoryId?: Id<"productCategories">;
  showCategoryChips?: boolean;
  showProductCount?: boolean;
  showCatalogSummary?: boolean;
  cacheKey?: string;
  listHeaderExtra?: React.ReactNode;
  initialFilters?: Partial<CatalogFilterState>;
  style?: ViewStyle;
};

export function ProductCatalogView({
  fixedCategoryId,
  showCategoryChips = true,
  showProductCount = false,
  showCatalogSummary = true,
  cacheKey,
  listHeaderExtra,
  initialFilters,
  style,
}: ProductCatalogViewProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createProductCatalogViewStyles);
  const now = useStableNow();
  const { isOffline } = useNetworkStatus();
  const { horizontalPadding, gridGap } = useLayoutMetrics();
  const { layout, setLayout } = useCatalogLayout();

  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState<CatalogFilterState>({
    ...DEFAULT_CATALOG_FILTERS,
    ...initialFilters,
    categoryId: fixedCategoryId ?? initialFilters?.categoryId,
  });
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const filtersWithSearch = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const isHybridSearch = debouncedSearch.trim().length > 0;
  const hybridSearch = useCatalogHybridSearch(debouncedSearch, PAGE_SIZE);
  const hybridSearchReady = isHybridSearch && !hybridSearch.loading;

  const liveCategories = useQuery(api.productCategories.listActive);
  const categories = useOfflineCache<HomeCategory[]>(
    offlineKeys.categoriesActive,
    liveCategories
  );
  const priceBounds = useQuery(api.products.getPublicPriceBounds, {});

  const facetArgs = useMemo(
    () =>
      toFacetArgs(filtersWithSearch, now, {
        isHybridSearch,
        hybridProductIds: hybridSearch.resultProductIds,
        fixedCategoryId,
      }),
    [filtersWithSearch, now, isHybridSearch, hybridSearch.resultProductIds, fixedCategoryId]
  );

  const facets = useQuery(api.products.getPublicFilterFacets, facetArgs);

  const queryArgs = useMemo(
    () =>
      toPublicFilterArgs(filtersWithSearch, now, {
        includeSearch: false,
        fixedCategoryId,
        productIds:
          isHybridSearch && hybridSearchReady
            ? hybridSearch.resultProductIds
            : undefined,
      }),
    [
      filtersWithSearch,
      now,
      fixedCategoryId,
      isHybridSearch,
      hybridSearchReady,
      hybridSearch.resultProductIds,
    ]
  );

  const catalogQueryEnabled = !isHybridSearch || hybridSearchReady;

  const productCount = useQuery(
    api.products.countPublicFiltered,
    showCatalogSummary && catalogQueryEnabled ? queryArgs : "skip"
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.products.listPublicPaginated,
    catalogQueryEnabled ? queryArgs : "skip",
    { initialNumItems: PAGE_SIZE }
  );

  const paginatedProducts = useMemo(() => {
    const page = results ?? [];
    if (!isHybridSearch || filters.sort !== "default" || page.length === 0) {
      return page;
    }
    const rankById = new Map(
      hybridSearch.resultProductIds.map((id, index) => [id, index])
    );
    return [...page].sort(
      (a, b) =>
        (rankById.get(a._id as Id<"products">) ?? Number.MAX_SAFE_INTEGER) -
        (rankById.get(b._id as Id<"products">) ?? Number.MAX_SAFE_INTEGER)
    );
  }, [
    results,
    isHybridSearch,
    filters.sort,
    hybridSearch.resultProductIds,
  ]);

  const products = paginatedProducts;

  const hasActiveConstraints = hasActiveCatalogConstraints(filtersWithSearch);

  const liveShopProducts = useMemo(() => {
    if (
      hasActiveConstraints ||
      !catalogQueryEnabled ||
      status === "LoadingFirstPage" ||
      products.length === 0
    ) {
      return undefined;
    }
    return products.length > MAX_CATEGORY_PRODUCTS
      ? products.slice(0, MAX_CATEGORY_PRODUCTS)
      : products;
  }, [hasActiveConstraints, catalogQueryEnabled, status, products]);

  const offlineCacheKey =
    cacheKey ??
    offlineKeys.shop(fixedCategoryId ?? filters.categoryId ?? "all");

  const cachedShop = useOfflineCache<Product[]>(offlineCacheKey, liveShopProducts);

  const displayProducts =
    products.length > 0
      ? products
      : isOffline && !hasActiveConstraints
        ? cachedShop.data ?? []
        : [];

  const fromCache =
    isOffline &&
    !hasActiveConstraints &&
    products.length === 0 &&
    Boolean(cachedShop.data?.length);

  const isLoading =
    (isHybridSearch && hybridSearch.loading && displayProducts.length === 0 && !isOffline) ||
    (catalogQueryEnabled &&
      status === "LoadingFirstPage" &&
      displayProducts.length === 0 &&
      !isOffline);

  const canLoadMore =
    catalogQueryEnabled && status === "CanLoadMore" && !isOffline;

  const handleEndReached = useCallback(() => {
    if (canLoadMore) loadMore(PAGE_SIZE);
  }, [canLoadMore, loadMore]);

  const activeFilterCount = countActiveCatalogFilters(filtersWithSearch);
  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === filters.sort)?.label ?? "Sort";

  const categoryName = useMemo(() => {
    const id = fixedCategoryId ?? filters.categoryId;
    if (!id) return undefined;
    return categories.data?.find((cat) => cat._id === id)?.name;
  }, [categories.data, filters.categoryId, fixedCategoryId]);

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

  const renderItem: ListRenderItem<Product> = useCallback(
    ({ item }: ListRenderItemInfo<Product>) => {
      if (layout === "list") {
        return (
          <ProductCard
            product={item}
            variant="list"
            showActions
            onQuickView={() => setQuickViewProduct(item)}
          />
        );
      }
      return (
        <View style={styles.gridItem}>
          <ProductCard
            product={item}
            variant="grid"
            showActions
            onQuickView={() => setQuickViewProduct(item)}
          />
        </View>
      );
    },
    [layout]
  );

  const ListHeader = (
    <View style={styles.toolbar}>
      {fromCache ? (
        <CachedDataNotice
          title="Showing saved products"
          message="Price and availability may have changed."
        />
      ) : null}
      {listHeaderExtra}
      <SearchBarInput
        value={searchInput}
        onChangeText={setSearchInput}
        placeholder="Search the catalog…"
        showVisualSearch
      />

      {showCategoryChips && !fixedCategoryId ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChips}
        >
          <Chip
            label="All"
            selected={!filters.categoryId}
            onPress={() => setFilters((prev) => ({ ...prev, categoryId: undefined }))}
          />
          {categories.data?.map((cat) => (
            <Chip
              key={cat._id}
              label={cat.name}
              selected={filters.categoryId === cat._id}
              onPress={() =>
                setFilters((prev) => ({
                  ...prev,
                  categoryId:
                    prev.categoryId === cat._id
                      ? undefined
                      : (cat._id as Id<"productCategories">),
                }))
              }
            />
          ))}
        </ScrollView>
      ) : null}

      <CatalogActiveFilters
        filters={filtersWithSearch}
        categoryName={categoryName}
        brandLabels={brandLabels}
        colorLabels={colorLabels}
        promotionLabels={promotionLabels}
        onChange={(next) => {
          setFilters(next);
          if (!next.search.trim()) setSearchInput("");
        }}
        preserveCategoryId={Boolean(fixedCategoryId)}
      />

      {isHybridSearch && hybridSearch.isSimilarFallback ? (
        <View style={styles.similarBanner}>
          <Text style={styles.similarBannerText}>
            No exact matches for "{debouncedSearch.trim()}". Showing similar products.
          </Text>
        </View>
      ) : null}

      <View style={styles.catalogSummary}>
        {showCatalogSummary && productCount !== undefined ? (
          <Text style={styles.summaryCount}>
            {productCount} product{productCount === 1 ? "" : "s"}
          </Text>
        ) : (
          <View style={styles.summarySpacer} />
        )}
        <View style={styles.summaryActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Filter products. ${activeFilterCount} active filters`}
            onPress={() => setFiltersVisible(true)}
            style={({ pressed }) => [
              styles.filterBtn,
              activeFilterCount > 0 && styles.filterBtnActive,
              pressed && styles.filterPressed,
            ]}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={activeFilterCount > 0 ? colors.selected : colors.foreground}
            />
            <Text style={[styles.filterText, activeFilterCount > 0 && styles.filterTextActive]}>
              Filter{activeFilterCount > 0 ? ` ${activeFilterCount}` : ""}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${sortLabel}`}
            onPress={() => setFiltersVisible(true)}
            style={({ pressed }) => [styles.sortBtn, pressed && styles.filterPressed]}
          >
            <Text style={styles.sortBtnText} numberOfLines={1}>
              Sort: {sortLabel}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
          </Pressable>

          <IconSegmentedControl
            accessibilityLabel="Product layout"
            value={layout}
            onChange={setLayout}
            options={[
              {
                value: "grid",
                icon: "grid-outline",
                accessibilityLabel: "Grid view",
              },
              {
                value: "list",
                icon: "list-outline",
                accessibilityLabel: "List view",
              },
            ]}
          />
        </View>
      </View>
    </View>
  );

  const ListFooter = (
    <>
      {(status === "LoadingMore") ? (
        <View style={styles.loadingMore}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
      <MobileFooter compactBottom />
    </>
  );

  if (isLoading && displayProducts.length === 0) {
    return (
      <View style={[styles.skeletonGrid, { paddingHorizontal: horizontalPadding }]}>
        {ListHeader}
        <View style={styles.gridRow}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.gridItem}>
              <ProductCardSkeleton />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (displayProducts.length === 0) {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing["2xl"] }}
      >
        <View style={{ paddingHorizontal: horizontalPadding }}>
          {ListHeader}
          {isOffline && hasActiveConstraints ? (
            <OfflineNotice
              title="You're offline"
              message="Filtered and search results need an internet connection."
              onRetry={() => {
                setFilters({
                  ...DEFAULT_CATALOG_FILTERS,
                  categoryId: fixedCategoryId,
                });
                setSearchInput("");
              }}
            />
          ) : isOffline ? (
            <OfflineNotice
              title="You're offline"
              message="Connect to browse the catalog or adjust filters."
              onRetry={() => setFilters(DEFAULT_CATALOG_FILTERS)}
            />
          ) : (
            <EmptyState
              icon="search-outline"
              title="No products found"
              description="Try different filters, search terms, or reset to see everything."
              actionLabel="Reset filters"
              onAction={() => {
                setFilters({
                  ...DEFAULT_CATALOG_FILTERS,
                  categoryId: fixedCategoryId,
                });
                setSearchInput("");
              }}
              compact
            >
              <Button
                label="Browse products"
                variant="outline"
                onPress={() => {
                  setFilters({
                    ...DEFAULT_CATALOG_FILTERS,
                    categoryId: fixedCategoryId,
                  });
                  setSearchInput("");
                }}
              />
            </EmptyState>
          )}
        </View>
        <MobileFooter compactBottom />
        <CatalogFiltersSheet
          visible={filtersVisible}
          onClose={() => setFiltersVisible(false)}
          filters={filters}
          onApply={(next) => {
            setFilters(next);
            if (!next.search.trim()) setSearchInput("");
          }}
          priceBounds={priceBounds ?? undefined}
          facets={facets}
          categories={categories.data ?? []}
          showCategorySection={!fixedCategoryId}
          fixedCategoryId={fixedCategoryId}
        />
        <ProductQuickViewSheet
          productId={quickViewProduct?._id as Id<"products"> | null}
          fallbackProduct={quickViewProduct}
          visible={Boolean(quickViewProduct)}
          onClose={() => setQuickViewProduct(null)}
        />
      </ScrollView>
    );
  }

  return (
    <View style={[styles.root, style]}>
      <FlatList
        key={layout}
        style={styles.list}
        data={displayProducts}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        numColumns={layout === "grid" ? 2 : 1}
        columnWrapperStyle={layout === "grid" ? [styles.gridRow, { gap: gridGap }] : undefined}
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: horizontalPadding },
        ]}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
      />

      <CatalogFiltersSheet
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        filters={filters}
        onApply={(next) => {
          setFilters(next);
          if (!next.search.trim()) setSearchInput("");
        }}
        priceBounds={priceBounds ?? undefined}
        facets={facets}
        categories={categories.data ?? []}
        showCategorySection={!fixedCategoryId}
        fixedCategoryId={fixedCategoryId}
      />

      <ProductQuickViewSheet
        productId={quickViewProduct?._id as Id<"products"> | null}
        fallbackProduct={quickViewProduct}
        visible={Boolean(quickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
      />
    </View>
  );
}

function createProductCatalogViewStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    root: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  productCount: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  toolbar: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  categoryChips: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  similarBanner: {
    backgroundColor: colors.chipBackground,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  similarBannerText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  catalogSummary: {
    gap: spacing.sm,
  },
  summaryCount: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  summarySpacer: {
    height: 0,
  },
  summaryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.selectedMuted,
    borderColor: colors.selected,
  },
  sortBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sortBtnText: {
    flexShrink: 1,
    fontSize: typography.sm,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  filterPressed: {
    opacity: 0.88,
  },
  filterText: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  filterTextActive: {
    color: colors.selected,
  },
  listContent: {
    paddingBottom: spacing["3xl"],
  },
  gridRow: {
    marginBottom: spacing.md,
    alignItems: "stretch",
  },
  gridItem: {
    flex: 1,
  },
  skeletonGrid: {
    flex: 1,
  },
  loadingMore: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  });
}


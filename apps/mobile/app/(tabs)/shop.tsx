import { usePaginatedQuery, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  ListRenderItem,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  CatalogFiltersSheet,
  type CatalogFilters,
} from "@/components/catalog/CatalogFiltersSheet";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/layout/Header";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/feedback/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useStableNow } from "@/hooks/useStableNow";
import { api } from "@/lib/convex-api";
import type { Product } from "@/types/product";
import type { Id } from "@convex/_generated/dataModel";

const PAGE_SIZE = 20;

export default function ShopScreen() {
  const now = useStableNow();
  const { horizontalPadding, gridGap } = useLayoutMetrics();
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState<CatalogFilters>({
    sort: "default",
    inStockOnly: false,
  });

  const categories = useQuery(api.productCategories.listActive);
  const priceBounds = useQuery(api.products.getPublicPriceBounds, {});

  const queryArgs = useMemo(
    () => ({
      now,
      sort: filters.sort,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      inStockOnly: filters.inStockOnly || undefined,
      categoryId: filters.categoryId as Id<"productCategories"> | undefined,
    }),
    [now, filters]
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.products.listPublicPaginated,
    queryArgs,
    { initialNumItems: PAGE_SIZE }
  );

  const products = useMemo(() => results ?? [], [results]);
  const isLoading = status === "LoadingFirstPage";
  const canLoadMore = status === "CanLoadMore";

  const handleEndReached = useCallback(() => {
    if (canLoadMore) loadMore(PAGE_SIZE);
  }, [canLoadMore, loadMore]);

  const renderItem: ListRenderItem<Product> = useCallback(
    ({ item }) => (
      <View style={styles.gridItem}>
        <ProductCard product={item} showActions />
      </View>
    ),
    []
  );

  const ListHeader = (
    <View style={styles.toolbar}>
      <View style={styles.searchTap}>
        <SearchBar placeholder="Search the catalog…" />
      </View>

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
        {categories?.map((cat) => (
          <Chip
            key={cat._id}
            label={cat.name}
            selected={filters.categoryId === cat._id}
            onPress={() =>
              setFilters((prev) => ({
                ...prev,
                categoryId: prev.categoryId === cat._id ? undefined : cat._id,
              }))
            }
          />
        ))}
      </ScrollView>

      <View style={styles.filterRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open filters and sort"
          onPress={() => setFiltersVisible(true)}
          style={({ pressed }) => [styles.filterBtn, pressed && styles.filterPressed]}
        >
          <Ionicons name="options-outline" size={18} color={colors.foreground} />
          <Text style={styles.filterText}>Filter & Sort</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Header title="Shop" showSearch={false} />
        {isLoading && products.length === 0 ? (
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
        ) : products.length === 0 ? (
          <View style={{ paddingHorizontal: horizontalPadding }}>
            {ListHeader}
            <EmptyState
              icon="search-outline"
              title="No products found"
              description="Try adjusting your filters or check back later."
              actionLabel="Clear Filters"
              onAction={() => setFilters({ sort: "default", inStockOnly: false })}
              compact
            />
          </View>
        ) : (
          <FlatList
            data={products}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            numColumns={2}
            columnWrapperStyle={[styles.gridRow, { gap: gridGap }]}
            contentContainerStyle={[
              styles.listContent,
              { paddingHorizontal: horizontalPadding },
            ]}
            ListHeaderComponent={ListHeader}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            showsVerticalScrollIndicator={false}
          />
        )}

        <CatalogFiltersSheet
          visible={filtersVisible}
          onClose={() => setFiltersVisible(false)}
          filters={filters}
          onApply={setFilters}
          priceBounds={priceBounds ?? undefined}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toolbar: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  searchTap: {
    marginTop: spacing.xs,
  },
  categoryChips: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  filterRow: {
    flexDirection: "row",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterPressed: {
    opacity: 0.88,
  },
  filterText: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  listContent: {
    paddingBottom: spacing["3xl"],
  },
  gridRow: {
    marginBottom: spacing.md,
  },
  gridItem: {
    flex: 1,
  },
  skeletonGrid: {
    flex: 1,
  },
});

import { usePaginatedQuery, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  CatalogFiltersSheet,
  type CatalogFilters,
} from "@/components/catalog/CatalogFiltersSheet";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/layout/Header";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useStableNow } from "@/hooks/useStableNow";
import { api } from "@/lib/convex-api";
import type { Product } from "@/types/product";
import type { Id } from "@convex/_generated/dataModel";

const PAGE_SIZE = 20;

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const now = useStableNow();
  const { horizontalPadding, gridGap } = useLayoutMetrics();
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState<CatalogFilters>({
    sort: "default",
    inStockOnly: false,
  });

  const categories = useQuery(api.productCategories.listActive);
  const category = useMemo(
    () => categories?.find((c) => c.slug === slug),
    [categories, slug]
  );

  const productCount = useQuery(
    api.products.countPublicFiltered,
    category
      ? {
          now,
          categoryId: category._id,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          inStockOnly: filters.inStockOnly || undefined,
        }
      : "skip"
  );

  const categoryMeta = useQuery(api.productCategories.listWithProductCounts, {});
  const categoryImage = categoryMeta?.find((c) => c.slug === slug)?.sampleImageUrl;

  const priceBounds = useQuery(api.products.getPublicPriceBounds, {});

  const { results, status, loadMore } = usePaginatedQuery(
    api.products.listPublicPaginated,
    category
      ? {
          now,
          categoryId: category._id as Id<"productCategories">,
          sort: filters.sort,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          inStockOnly: filters.inStockOnly || undefined,
        }
      : "skip",
    { initialNumItems: PAGE_SIZE }
  );

  const products = useMemo(() => results ?? [], [results]);
  const isLoading = status === "LoadingFirstPage" || categories === undefined;
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

  if (categories === undefined) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <Header title="Category" showBack showSearch={false} />
          <View style={[styles.skeletonGrid, { paddingHorizontal: horizontalPadding }]}>
            <View style={[styles.gridRow, { gap: gridGap }]}>
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={styles.gridItem}>
                  <ProductCardSkeleton />
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (!category) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <Header title="Category" showBack showSearch={false} />
          <EmptyState
            icon="grid-outline"
            title="Category not found"
            description="This category may no longer exist."
            compact
          />
        </View>
      </ScreenContainer>
    );
  }

  const ListHeader = (
    <View style={styles.header}>
      {categoryImage ? (
        <View style={styles.bannerWrap}>
          <Image source={{ uri: categoryImage }} style={styles.banner} contentFit="cover" />
          <View style={styles.bannerOverlay} />
        </View>
      ) : null}
      {category.description ? (
        <Text style={styles.description}>{category.description}</Text>
      ) : null}
      {productCount !== undefined ? (
        <Text style={styles.count}>
          {productCount} product{productCount === 1 ? "" : "s"}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open filters and sort"
        onPress={() => setFiltersVisible(true)}
        style={({ pressed }) => [styles.filterButton, pressed && styles.filterPressed]}
      >
        <Ionicons name="options-outline" size={18} color={colors.foreground} />
        <Text style={styles.filterText}>Filter & Sort</Text>
      </Pressable>
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Header title={category.name} showBack showSearch={false} />
        {isLoading && products.length === 0 ? (
          <View style={[styles.skeletonGrid, { paddingHorizontal: horizontalPadding }]}>
            <View style={[styles.gridRow, { gap: gridGap }]}>
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
              icon="cube-outline"
            title="No products in this category"
            description="Nothing is listed here right now. Browse other categories or check back soon."
            actionLabel="Browse the shop"
            onAction={() => router.push("/(tabs)/shop")}
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
  header: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  bannerWrap: {
    height: 120,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.borderLight,
  },
  banner: {
    width: "100%",
    height: "100%",
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  description: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  count: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    paddingTop: spacing.lg,
  },
});

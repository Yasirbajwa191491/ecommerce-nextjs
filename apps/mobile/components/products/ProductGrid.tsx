import { useCallback } from "react";
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  View,
  type FlatListProps,
} from "react-native";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { ProductCard } from "@/components/products/ProductCard";
import { colors, spacing } from "@/constants/theme";
import type { Product } from "@/types/product";

type ProductGridProps = Omit<
  FlatListProps<Product>,
  "data" | "renderItem" | "keyExtractor" | "numColumns"
> & {
  products: Product[] | undefined;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  onEndReached?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
};

const NUM_COLUMNS = 2;

export function ProductGrid({
  products,
  isLoading = false,
  isError = false,
  onRetry,
  emptyTitle = "No products found",
  emptyDescription = "Try adjusting filters or check back later for new arrivals.",
  onEndReached,
  refreshing,
  onRefresh,
  ...listProps
}: ProductGridProps) {
  const renderItem: ListRenderItem<Product> = useCallback(
    ({ item }) => (
      <View style={styles.itemWrap}>
        <ProductCard product={item} showActions />
      </View>
    ),
    []
  );

  const keyExtractor = useCallback((item: Product) => item._id, []);

  if (isLoading && (!products || products.length === 0)) {
    return (
      <View style={styles.skeletonGrid}>
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={index} style={styles.itemWrap}>
            <ProductCardSkeleton />
          </View>
        ))}
      </View>
    );
  }

  if (isError) {
    return <ErrorState onRetry={onRetry} />;
  }

  if (products && products.length === 0) {
    return (
      <EmptyState
        icon="search-outline"
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={onRetry ? "Refresh" : undefined}
        onAction={onRetry}
      />
    );
  }

  return (
    <FlatList
      data={products ?? []}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={NUM_COLUMNS}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        ) : undefined
      }
      {...listProps}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing["3xl"],
  },
  row: {
    gap: spacing.md,
  },
  itemWrap: {
    flex: 1,
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing.lg,
    gap: spacing.md,
  },
});

import { useCallback } from "react";
import { FlatList, ListRenderItem, StyleSheet, View } from "react-native";

import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { ProductCard } from "@/components/products/ProductCard";
import { spacing } from "@/constants/theme";
import {
  getCarouselCardWidth,
  useLayoutMetrics,
  type CarouselSize,
} from "@/hooks/useLayoutMetrics";
import type { Product } from "@/types/product";

type ProductCarouselProps = {
  products: Product[] | undefined;
  isLoading?: boolean;
  size?: CarouselSize;
  showRank?: boolean;
};

export function ProductCarousel({
  products,
  isLoading = false,
  size = "medium",
  showRank = false,
}: ProductCarouselProps) {
  const metrics = useLayoutMetrics();
  const { horizontalPadding, gridGap } = metrics;
  const carouselCardWidth = getCarouselCardWidth(metrics, size);
  const snapInterval = carouselCardWidth + gridGap;

  const renderItem: ListRenderItem<Product> = useCallback(
    ({ item, index }) => (
      <ProductCard
        product={item}
        variant="carousel"
        showActions
        rank={showRank ? index + 1 : undefined}
        width={carouselCardWidth}
        style={styles.item}
      />
    ),
    [carouselCardWidth, showRank]
  );

  if (isLoading) {
    return (
      <View style={[styles.skeletonRow, { paddingHorizontal: horizontalPadding }]}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={{ width: carouselCardWidth, marginRight: gridGap }}>
            <ProductCardSkeleton width={carouselCardWidth} />
          </View>
        ))}
      </View>
    );
  }

  if (!products || products.length === 0) return null;

  return (
    <FlatList
      data={products}
      renderItem={renderItem}
      keyExtractor={(item) => item._id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
      decelerationRate="fast"
      snapToInterval={snapInterval}
      snapToAlignment="start"
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing.xs,
  },
  item: {
    marginRight: spacing.md,
  },
  skeletonRow: {
    flexDirection: "row",
  },
});

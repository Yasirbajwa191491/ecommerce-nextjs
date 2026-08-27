import { StyleSheet, View } from "react-native";

import { ProductCard } from "@/components/products/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { spacing } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import type { Product } from "@/types/product";

type ProductGridInlineProps = {
  products: Product[] | undefined;
  isLoading?: boolean;
  showActions?: boolean;
  showRank?: boolean;
  limit?: number;
};

/** Nested-scroll-safe 2-column product grid for home and similar feeds. */
export function ProductGridInline({
  products,
  isLoading = false,
  showActions = true,
  showRank = false,
  limit,
}: ProductGridInlineProps) {
  const { horizontalPadding, gridGap, gridItemWidth } = useLayoutMetrics();
  const items = limit ? (products ?? []).slice(0, limit) : (products ?? []);

  if (isLoading && items.length === 0) {
    return (
      <View style={[styles.grid, { paddingHorizontal: horizontalPadding, gap: gridGap }]}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={{ width: gridItemWidth }}>
            <ProductCardSkeleton width={gridItemWidth} />
          </View>
        ))}
      </View>
    );
  }

  if (items.length === 0) return null;

  return (
    <View style={[styles.grid, { paddingHorizontal: horizontalPadding, gap: gridGap }]}>
      {items.map((product, index) => (
        <View key={product._id} style={{ width: gridItemWidth, alignSelf: "stretch" }}>
          <ProductCard
            product={product}
            showActions={showActions}
            rank={showRank ? index + 1 : undefined}
            width={gridItemWidth}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
    paddingBottom: spacing.xs,
  },
});

import { StyleSheet, View } from "react-native";

import { CategoryCard } from "@/components/home/CategoryCard";
import { CategoryCardSkeleton } from "@/components/ui/Skeleton";
import { spacing } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";

type CategoryItem = {
  _id: string;
  name: string;
  slug: string;
  productCount: number;
  sampleImageUrl?: string | null;
};

type CategoryGridProps = {
  categories: CategoryItem[] | undefined;
  isLoading?: boolean;
  limit?: number;
};

export function CategoryGrid({ categories, isLoading = false, limit = 6 }: CategoryGridProps) {
  const { horizontalPadding, gridGap, gridItemWidth } = useLayoutMetrics();
  const items = (categories ?? []).slice(0, limit);

  if (isLoading) {
    return (
      <View style={[styles.grid, { paddingHorizontal: horizontalPadding, gap: gridGap }]}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={{ width: gridItemWidth }}>
            <CategoryCardSkeleton width={gridItemWidth} />
          </View>
        ))}
      </View>
    );
  }

  if (items.length === 0) return null;

  return (
    <View style={[styles.grid, { paddingHorizontal: horizontalPadding, gap: gridGap }]}>
      {items.map((item) => (
        <CategoryCard
          key={item._id}
          name={item.name}
          slug={item.slug}
          productCount={item.productCount}
          sampleImageUrl={item.sampleImageUrl}
          width={gridItemWidth}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingBottom: spacing.xs,
  },
});

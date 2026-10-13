import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

import { layout, spacing } from "@/constants/theme";

export type CarouselSize = "featured" | "medium";

export function useLayoutMetrics() {
  const { width: screenWidth } = useWindowDimensions();

  return useMemo(() => {
    const contentWidth = Math.min(screenWidth, layout.maxContentWidth);
    const horizontalPadding = contentWidth >= 768 ? spacing["2xl"] : screenWidth < 360 ? spacing.lg : layout.screenPadding;
    const gridGap = spacing.md;
    const contentInner = contentWidth - horizontalPadding * 2;

    const gridColumns = contentWidth >= 1000 ? 4 : contentWidth >= 600 ? 3 : layout.gridColumns;
    const gridItemWidth = (contentInner - gridGap * (gridColumns - 1)) / gridColumns;
    const carouselCardWidth = Math.min(300, contentInner * layout.carouselCardWidthRatio);
    const featuredCarouselCardWidth = Math.min(360, contentInner * layout.featuredCarouselWidthRatio);
    const categoryCardWidth = layout.categoryCardWidth;

    return {
      screenWidth,
      contentWidth,
      horizontalPadding,
      gridGap,
      gridColumns,
      gridItemWidth,
      carouselCardWidth,
      featuredCarouselCardWidth,
      categoryCardWidth,
    };
  }, [screenWidth]);
}

export function getCarouselCardWidth(
  metrics: ReturnType<typeof useLayoutMetrics>,
  size: CarouselSize = "medium"
) {
  return size === "featured"
    ? metrics.featuredCarouselCardWidth
    : metrics.carouselCardWidth;
}

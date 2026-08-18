import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

import { layout, spacing } from "@/constants/theme";

export type CarouselSize = "featured" | "medium";

export function useLayoutMetrics() {
  const { width: screenWidth } = useWindowDimensions();

  return useMemo(() => {
    const contentWidth = Math.min(screenWidth, layout.maxContentWidth);
    const horizontalPadding = spacing.lg;
    const gridGap = spacing.md;
    const contentInner = contentWidth - horizontalPadding * 2;

    const gridItemWidth = (contentInner - gridGap) / layout.gridColumns;
    const carouselCardWidth = contentInner * layout.carouselCardWidthRatio;
    const featuredCarouselCardWidth = contentInner * layout.featuredCarouselWidthRatio;
    const categoryCardWidth = layout.categoryCardWidth;

    return {
      screenWidth,
      contentWidth,
      horizontalPadding,
      gridGap,
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

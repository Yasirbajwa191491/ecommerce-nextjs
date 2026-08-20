import { useEffect, useMemo } from "react";
import { Animated, StyleSheet, View, ViewProps } from "react-native";

import { colors, layout, radius, spacing } from "@/constants/theme";

type SkeletonProps = ViewProps & {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
};

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = radius.sm,
  style,
  ...props
}: SkeletonProps) {
  const opacity = useMemo(() => new Animated.Value(0.35), []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
      style={[styles.base, { width, height, borderRadius, opacity }, style]}
      {...props}
    />
  );
}

type ProductCardSkeletonProps = {
  width?: number;
};

export function ProductCardSkeleton({ width }: ProductCardSkeletonProps) {
  const imageHeight = width ? width / layout.productImageAspect : 160;

  return (
    <View style={[styles.card, width ? { width } : styles.cardFlex]} accessibilityLabel="Loading product">
      <Skeleton height={imageHeight} borderRadius={0} />
      <View style={styles.content}>
        <Skeleton height={14} width="90%" />
        <Skeleton height={12} width="50%" />
        <Skeleton height={16} width="40%" />
        <Skeleton height={48} borderRadius={radius.sm} />
      </View>
    </View>
  );
}

export function CategoryCardSkeleton({ width = layout.categoryCardWidth }: { width?: number }) {
  return (
    <View style={[styles.categoryCard, { width }]} accessibilityLabel="Loading category">
      <Skeleton height={layout.categoryImageHeight} borderRadius={0} />
      <View style={styles.content}>
        <Skeleton height={14} width="70%" />
        <Skeleton height={11} width="45%" />
      </View>
    </View>
  );
}

export function ProductDetailSkeleton() {
  return (
    <View style={styles.pdp} accessibilityLabel="Loading product">
      <Skeleton height={360} borderRadius={0} />
      <View style={styles.pdpContent}>
        <Skeleton height={12} width="30%" />
        <Skeleton height={26} width="88%" />
        <Skeleton height={16} width="40%" />
        <Skeleton height={72} borderRadius={radius.md} />
        <Skeleton height={48} borderRadius={radius.md} />
        <Skeleton height={48} borderRadius={radius.md} />
      </View>
    </View>
  );
}

export function HomeFeedSkeleton() {
  return (
    <View style={styles.homeFeed} accessibilityLabel="Loading home">
      <Skeleton height={72} borderRadius={radius.md} />
      <View style={styles.homeCarousel}>
        <ProductCardSkeleton width={240} />
        <ProductCardSkeleton width={240} />
      </View>
      <View style={styles.homeCats}>
        <CategoryCardSkeleton />
        <CategoryCardSkeleton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.border,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  cardFlex: {
    flex: 1,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  pdp: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  pdpContent: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  homeFeed: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing["2xl"],
  },
  homeCarousel: {
    flexDirection: "row",
    gap: spacing.md,
  },
  homeCats: {
    flexDirection: "row",
    gap: spacing.md,
  },
});

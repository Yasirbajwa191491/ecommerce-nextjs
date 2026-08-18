import { useEffect, useMemo } from "react";
import { Animated, StyleSheet, View, ViewProps } from "react-native";

import { colors, layout, radius } from "@/constants/theme";

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
        <Skeleton height={36} borderRadius={radius.sm} />
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

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.border,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  cardFlex: {
    flex: 1,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  content: {
    padding: 12,
    gap: 8,
  },
});

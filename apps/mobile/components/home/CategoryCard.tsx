import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PressableScale } from "@/components/ui/PressableScale";
import { colors, layout, radius, shadows, spacing, textStyles, typography } from "@/constants/theme";

type CategoryCardProps = {
  name: string;
  slug: string;
  productCount: number;
  sampleImageUrl?: string | null;
  width?: number;
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  electronics: "hardware-chip-outline",
  furniture: "bed-outline",
  kitchen: "restaurant-outline",
  office: "briefcase-outline",
  living: "home-outline",
};

function getCategoryIcon(slug: string): keyof typeof Ionicons.glyphMap {
  return CATEGORY_ICONS[slug.toLowerCase()] ?? "grid-outline";
}

export function CategoryCard({
  name,
  slug,
  productCount,
  sampleImageUrl,
  width: widthProp,
}: CategoryCardProps) {
  const width = widthProp ?? layout.categoryCardWidth;
  const [imageError, setImageError] = useState(false);
  const showImage = sampleImageUrl && !imageError;

  return (
    <PressableScale
      onPress={() => router.push(`/category/${slug}`)}
      style={[styles.card, { width }]}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${productCount} products`}
    >
      <View style={[styles.imageWrap, { height: layout.categoryImageHeight }]}>
        {showImage ? (
          <Image
            source={{ uri: sampleImageUrl }}
            style={styles.image}
            contentFit="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name={getCategoryIcon(slug)} size={28} color={colors.primary} />
          </View>
        )}
      </View>
      <View style={styles.footer}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.count}>
          {productCount} product{productCount === 1 ? "" : "s"}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: "hidden",
    ...shadows.sm,
  },
  imageWrap: {
    width: "100%",
    backgroundColor: colors.borderLight,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryMuted,
  },
  footer: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    gap: 1,
  },
  name: {
    ...textStyles.cardTitle,
    fontSize: typography.sm,
  },
  count: {
    ...textStyles.caption,
  },
});

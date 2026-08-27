import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { typography } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

type RatingStarsProps = {
  rating: number;
  reviewCount?: number;
  size?: number;
  showCount?: boolean;
};

export function RatingStars({
  rating,
  reviewCount,
  size = 16,
  showCount = true,
}: RatingStarsProps) {
  const { colors, textStyles } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
        stars: { flexDirection: "row", gap: 1 },
        value: { fontSize: typography.sm, fontWeight: "600", color: colors.muted },
        count: { fontSize: typography.sm, color: colors.muted },
        empty: { ...textStyles.bodySmall, color: colors.muted },
      }),
    [colors, textStyles]
  );

  if (showCount && (reviewCount ?? 0) === 0) {
    return <Text style={styles.empty}>No Reviews Yet</Text>;
  }

  const clamped = Math.max(0, Math.min(5, rating));
  const label = showCount && reviewCount !== undefined
    ? `${clamped.toFixed(1)} stars, ${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}`
    : `${clamped.toFixed(1)} stars`;

  return (
    <View style={styles.row} accessibilityRole="text" accessibilityLabel={label}>
      <View style={styles.stars} accessibilityElementsHidden>
        {Array.from({ length: 5 }).map((_, index) => {
          const filled = clamped >= index + 1;
          const half = !filled && clamped > index && clamped < index + 1;
          let iconName: keyof typeof Ionicons.glyphMap = "star-outline";
          if (filled) iconName = "star";
          else if (half) iconName = "star-half";

          return (
            <Ionicons
              key={index}
              name={iconName}
              size={size}
              color={filled || half ? colors.warning : colors.mutedForeground}
            />
          );
        })}
      </View>
      <Text style={styles.value}>{clamped.toFixed(1)}</Text>
      {showCount && reviewCount !== undefined ? (
        <Text style={styles.count}>
          ({reviewCount.toLocaleString()} {reviewCount === 1 ? "review" : "reviews"})
        </Text>
      ) : null}
    </View>
  );
}

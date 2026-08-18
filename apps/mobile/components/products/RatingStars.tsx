import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, typography } from "@/constants/theme";

type RatingStarsProps = {
  rating: number;
  reviewCount?: number;
  size?: number;
  showCount?: boolean;
};

export function RatingStars({
  rating,
  reviewCount,
  size = 14,
  showCount = true,
}: RatingStarsProps) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <View style={styles.row}>
      <View style={styles.stars}>
        {Array.from({ length: 5 }).map((_, i) => {
          let iconName: keyof typeof Ionicons.glyphMap = "star-outline";
          if (i < fullStars) iconName = "star";
          else if (i === fullStars && hasHalf) iconName = "star-half";

          return (
            <Ionicons
              key={i}
              name={iconName}
              size={size}
              color={i <= fullStars ? colors.warning : colors.mutedForeground}
            />
          );
        })}
      </View>
      {showCount && reviewCount !== undefined ? (
        <Text style={styles.count}>({reviewCount})</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stars: {
    flexDirection: "row",
    gap: 1,
  },
  count: {
    fontSize: typography.xs,
    color: colors.muted,
  },
});

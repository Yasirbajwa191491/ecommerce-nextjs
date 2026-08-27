import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

type DistributionItem = {
  stars: 1 | 2 | 3 | 4 | 5;
  count: number;
  percent: number;
};

type RatingBreakdownProps = {
  distribution: DistributionItem[];
};

export function RatingBreakdown({ distribution }: RatingBreakdownProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { gap: spacing.sm },
        row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
        label: { width: 28, flexDirection: "row", alignItems: "center", gap: 2 },
        starLabel: { fontSize: typography.sm, fontWeight: "600", color: colors.foreground },
        starIcon: { fontSize: typography.xs, color: colors.warning },
        track: {
          flex: 1,
          height: 8,
          borderRadius: radius.full,
          backgroundColor: colors.borderLight,
          overflow: "hidden",
        },
        fill: { height: "100%", borderRadius: radius.full, backgroundColor: colors.warning },
        percent: {
          width: 36,
          textAlign: "right",
          fontSize: typography.xs,
          color: colors.textSecondary,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container} accessibilityRole="summary" accessibilityLabel="Rating breakdown">
      {distribution.map((item) => (
        <View key={item.stars} style={styles.row} accessibilityLabel={`${item.stars} stars, ${item.percent} percent`}>
          <View style={styles.label}>
            <Text style={styles.starLabel}>{item.stars}</Text>
            <Text style={styles.starIcon}>★</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${item.percent}%` }]} />
          </View>
          <Text style={styles.percent}>{item.percent}%</Text>
        </View>
      ))}
    </View>
  );
}

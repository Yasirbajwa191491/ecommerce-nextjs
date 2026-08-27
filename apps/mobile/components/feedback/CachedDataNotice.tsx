import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

type CachedDataNoticeProps = {
  title?: string;
  message?: string;
};

export function CachedDataNotice({
  title = "Showing saved product information",
  message = "Price and availability may have changed.",
}: CachedDataNoticeProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        banner: {
          backgroundColor: colors.warningMuted,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: 2,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.warning,
        },
        title: {
          fontSize: typography.sm,
          fontWeight: "700",
          color: colors.foreground,
        },
        message: {
          fontSize: typography.xs,
          color: colors.textSecondary,
          lineHeight: 16,
        },
      }),
    [colors]
  );

  return (
    <View
      style={styles.banner}
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${message}`}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

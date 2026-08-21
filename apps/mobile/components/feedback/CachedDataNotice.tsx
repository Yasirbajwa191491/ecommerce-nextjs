import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";

type CachedDataNoticeProps = {
  title?: string;
  message?: string;
};

export function CachedDataNotice({
  title = "Showing saved product information",
  message = "Price and availability may have changed.",
}: CachedDataNoticeProps) {
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

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#FFFBEB",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#FDE68A",
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
});

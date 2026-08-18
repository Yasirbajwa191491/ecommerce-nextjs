import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/constants/theme";

type LoadingViewProps = {
  message?: string;
};

export function LoadingView({ message = "Loading…" }: LoadingViewProps) {
  return (
    <View style={styles.container} accessibilityLabel={message} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
    gap: spacing.md,
  },
  message: {
    fontSize: typography.sm,
    color: colors.muted,
  },
});

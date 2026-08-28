import { ActivityIndicator, Text, View, StyleSheet } from "react-native";

import { spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";

type LoadingViewProps = {
  message?: string;
};

export function LoadingView({ message = "Loading…" }: LoadingViewProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createLoadingViewStyles);

  return (
    <View style={styles.container} accessibilityLabel={message} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.cta} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

function createLoadingViewStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      padding: spacing["2xl"],
      gap: spacing.md,
    },
    message: {
      fontSize: typography.sm,
      color: colors.muted,
    },
  });
}

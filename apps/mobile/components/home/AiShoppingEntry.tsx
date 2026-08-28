import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View, StyleSheet } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";

export function AiShoppingEntry() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { horizontalPadding } = useLayoutMetrics();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="AI Shopping Assistant"
      onPress={() => router.push("/(tabs)/ai")}
      style={({ pressed }) => [
        styles.container,
        { marginHorizontal: horizontalPadding },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={17} color={colors.cta} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Shop smarter with AI</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            Describe what you need and get personalized product recommendations.
          </Text>
        </View>
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>Ask AI</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.ctaForeground} />
      </View>
    </Pressable>
  );
}

function createStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    container: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: {
      opacity: 0.94,
    },
    left: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm + 2,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: colors.ctaMuted,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    copy: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...textStyles.cardTitle,
      fontSize: typography.base,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    subtitle: {
      ...textStyles.caption,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    cta: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 2,
      backgroundColor: colors.cta,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      minHeight: 36,
      justifyContent: "center" as const,
    },
    ctaText: {
      fontSize: typography.sm,
      fontWeight: "600" as const,
      color: colors.ctaForeground,
    },
  });
}

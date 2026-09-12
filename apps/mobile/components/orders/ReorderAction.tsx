import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";

type ReorderActionProps = {
  disabled?: boolean;
  loading?: boolean;
  itemCount?: number;
  subtitle?: string;
  onPress: () => void;
};

export function ReorderAction({
  disabled = false,
  loading = false,
  itemCount,
  subtitle,
  onPress,
}: ReorderActionProps) {
  const styles = useThemedStyles(createReorderActionStyles);

  const resolvedSubtitle =
    subtitle ??
    (itemCount && itemCount > 0
      ? `${itemCount} item${itemCount === 1 ? "" : "s"} ready to add to your cart`
      : "Buy these items again at current prices");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Reorder items from this order"
      accessibilityHint={resolvedSubtitle}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && !disabled && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      <View style={styles.iconWrap}>
        {loading ? (
          <ActivityIndicator size="small" color={styles.iconTint.color} />
        ) : (
          <Ionicons name="bag-handle-outline" size={22} color={styles.iconTint.color} />
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.eyebrow}>Loved your order?</Text>
        <Text style={styles.title}>Reorder these items</Text>
        <Text style={styles.subtitle}>{resolvedSubtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={styles.chevron.color} />
    </Pressable>
  );
}

function createReorderActionStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(98, 84, 243, 0.22)",
      backgroundColor: colors.surface,
    },
    pressed: {
      backgroundColor: colors.primaryMuted,
    },
    disabled: {
      opacity: 0.55,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryMuted,
    },
    iconTint: {
      color: colors.primary,
    },
    content: {
      flex: 1,
      gap: 2,
    },
    eyebrow: {
      fontSize: typography.xs,
      fontWeight: "600",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    title: {
      fontSize: typography.base,
      fontWeight: "700",
      color: colors.foreground,
    },
    subtitle: {
      fontSize: typography.sm,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    chevron: {
      color: colors.muted,
    },
  });
}

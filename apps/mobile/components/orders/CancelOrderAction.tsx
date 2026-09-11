import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";

type CancelOrderActionProps = {
  disabled?: boolean;
  loading?: boolean;
  subtitle?: string;
  onPress: () => void;
};

export function CancelOrderAction({
  disabled = false,
  loading = false,
  subtitle = "Available before your order ships",
  onPress,
}: CancelOrderActionProps) {
  const styles = useThemedStyles(createCancelOrderActionStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cancel order"
      accessibilityHint={subtitle}
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
          <Ionicons name="close-circle-outline" size={22} color={styles.iconTint.color} />
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.eyebrow}>Need to change something?</Text>
        <Text style={styles.title}>Cancel this order</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={styles.chevron.color} />
    </Pressable>
  );
}

function createCancelOrderActionStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(239, 68, 68, 0.22)",
      backgroundColor: colors.surface,
    },
    pressed: {
      backgroundColor: colors.destructiveMuted,
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
      backgroundColor: colors.destructiveMuted,
    },
    iconTint: {
      color: colors.destructive,
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

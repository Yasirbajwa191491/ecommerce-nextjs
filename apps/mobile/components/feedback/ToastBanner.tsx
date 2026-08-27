import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, spacing, typography } from "@/constants/theme";
import { useToast, type ToastType } from "@/providers/toast-context";
import { useTheme } from "@/providers/theme-context";

const ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "alert-circle",
  warning: "warning",
  info: "information-circle",
};

export function ToastBanner() {
  const { toast } = useToast();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();

  const iconColors: Record<ToastType, string> = useMemo(
    () => ({
      success: colors.success,
      error: colors.destructive,
      warning: colors.warning,
      info: colors.textSecondary,
    }),
    [colors]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: "absolute",
          left: spacing.lg,
          right: spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          ...shadows.md,
        },
        text: {
          flex: 1,
          fontSize: typography.sm,
          fontWeight: "500",
          color: colors.foreground,
          lineHeight: 20,
        },
      }),
    [colors, shadows]
  );

  if (!toast) return null;

  const type = toast.type;

  return (
    <View
      style={[styles.container, { bottom: insets.bottom + 88 }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Ionicons name={ICONS[type]} size={18} color={iconColors[type]} />
      <Text style={styles.text}>{toast.message}</Text>
    </View>
  );
}

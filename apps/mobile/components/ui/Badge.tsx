import { useMemo } from "react";
import { StyleSheet, Text, View, ViewProps } from "react-native";

import { radius, typography } from "@/constants/theme";
import type { ColorPalette } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "destructive";

type BadgeProps = ViewProps & {
  label: string;
  variant?: BadgeVariant;
};

function variantStyles(colors: ColorPalette): Record<BadgeVariant, { bg: string; text: string }> {
  return {
    default: { bg: colors.chipBackground, text: colors.foreground },
    primary: { bg: colors.primaryMuted, text: colors.primary },
    success: { bg: colors.successMuted, text: colors.success },
    warning: { bg: colors.warningMuted, text: colors.warning },
    destructive: { bg: colors.destructiveMuted, text: colors.destructive },
  };
}

export function Badge({ label, variant = "default", style, ...props }: BadgeProps) {
  const { colors } = useTheme();
  const variants = useMemo(() => variantStyles(colors), [colors]);
  const variantStyle = variants[variant];
  const styles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          alignSelf: "flex-start",
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: radius.full,
        },
        label: { fontSize: typography.xs, fontWeight: "600" },
      }),
    []
  );

  return (
    <View
      accessibilityLabel={label}
      style={[styles.badge, { backgroundColor: variantStyle.bg }, style]}
      {...props}
    >
      <Text style={[styles.label, { color: variantStyle.text }]}>{label}</Text>
    </View>
  );
}

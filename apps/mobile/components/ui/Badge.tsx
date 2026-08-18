import { StyleSheet, Text, View, ViewProps } from "react-native";

import { colors, radius, typography } from "@/constants/theme";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "destructive";

type BadgeProps = ViewProps & {
  label: string;
  variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: "#F3F4F6", text: colors.foreground },
  primary: { bg: colors.primaryMuted, text: colors.primary },
  success: { bg: "#D1FAE5", text: colors.success },
  warning: { bg: "#FEF3C7", text: colors.warning },
  destructive: { bg: "#FEE2E2", text: colors.destructive },
};

export function Badge({ label, variant = "default", style, ...props }: BadgeProps) {
  const variantStyle = variantStyles[variant];

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

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  label: {
    fontSize: typography.xs,
    fontWeight: "600",
  },
});

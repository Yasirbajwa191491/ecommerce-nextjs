import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

import { lightColors, radius, sizes, typography } from "@/constants/theme";
import type { ColorPalette } from "@/constants/theme";
import { useThemeOptional } from "@/providers/theme-context";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = Omit<PressableProps, "children"> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
};

function getVariantStyles(
  colors: ColorPalette,
  variant: ButtonVariant
): { container: ViewStyle; text: string; pressed: ViewStyle; spinner: string } {
  const map: Record<
    ButtonVariant,
    { container: ViewStyle; text: string; pressed: ViewStyle; spinner: string }
  > = {
    primary: {
      container: { backgroundColor: colors.cta },
      text: colors.ctaForeground,
      pressed: { backgroundColor: colors.ctaPressed },
      spinner: colors.ctaForeground,
    },
    secondary: {
      container: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      },
      text: colors.foreground,
      pressed: { backgroundColor: colors.ctaMuted },
      spinner: colors.foreground,
    },
    outline: {
      container: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: colors.border,
      },
      text: colors.foreground,
      pressed: { backgroundColor: colors.ctaMuted },
      spinner: colors.foreground,
    },
    ghost: {
      container: { backgroundColor: "transparent" },
      text: colors.textSecondary,
      pressed: { backgroundColor: colors.ctaMuted },
      spinner: colors.foreground,
    },
    destructive: {
      container: { backgroundColor: colors.destructive },
      text: colors.destructiveForeground,
      pressed: { backgroundColor: colors.destructive, opacity: 0.85 },
      spinner: colors.destructiveForeground,
    },
  };
  return map[variant];
}

const sizeStyles: Record<ButtonSize, { container: ViewStyle; fontSize: number }> = {
  sm: { container: { minHeight: sizes.buttonSm, paddingHorizontal: 14 }, fontSize: typography.sm },
  md: { container: { minHeight: sizes.buttonMd, paddingHorizontal: 16 }, fontSize: typography.base },
  lg: { container: { minHeight: sizes.buttonLg, paddingHorizontal: 20 }, fontSize: typography.md },
};

export function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  style,
  accessibilityLabel,
  ...props
}: ButtonProps) {
  const colors = useThemeOptional()?.colors ?? lightColors;
  const variantStyle = getVariantStyles(colors, variant);
  const sizeStyle = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle.container,
        sizeStyle.container,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && variantStyle.pressed,
        isDisabled && styles.disabled,
        style as ViewStyle,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.spinner} size="small" />
      ) : (
        <Text style={[styles.label, { color: variantStyle.text, fontSize: sizeStyle.fontSize }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontWeight: "600",
  },
});

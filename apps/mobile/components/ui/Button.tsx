import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

import { colors, radius, touchTarget, typography } from "@/constants/theme";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = Omit<PressableProps, "children"> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
};

const variantStyles: Record<
  ButtonVariant,
  { container: ViewStyle; text: string; pressed: ViewStyle }
> = {
  primary: {
    container: { backgroundColor: colors.primary },
    text: colors.primaryForeground,
    pressed: { backgroundColor: "#5548e0" },
  },
  secondary: {
    container: { backgroundColor: colors.navy },
    text: colors.primaryForeground,
    pressed: { backgroundColor: "#0d1a42" },
  },
  outline: {
    container: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: colors.foreground,
    pressed: { backgroundColor: colors.primaryMuted },
  },
  ghost: {
    container: { backgroundColor: "transparent" },
    text: colors.primary,
    pressed: { backgroundColor: colors.primaryMuted },
  },
  destructive: {
    container: { backgroundColor: colors.destructive },
    text: colors.destructiveForeground,
    pressed: { backgroundColor: "#B91C1C" },
  },
};

const sizeStyles: Record<ButtonSize, { container: ViewStyle; fontSize: number }> = {
  sm: { container: { minHeight: 36, paddingHorizontal: 12 }, fontSize: typography.sm },
  md: { container: { minHeight: touchTarget, paddingHorizontal: 16 }, fontSize: typography.base },
  lg: { container: { minHeight: 48, paddingHorizontal: 20 }, fontSize: typography.lg },
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
  const variantStyle = variantStyles[variant];
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
        <ActivityIndicator
          color={variant === "outline" || variant === "ghost" ? colors.primary : colors.primaryForeground}
          size="small"
        />
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
    borderRadius: radius.lg,
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

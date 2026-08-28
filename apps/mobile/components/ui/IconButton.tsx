import { Ionicons } from "@expo/vector-icons";
import { Pressable, View, type ViewStyle, StyleSheet } from "react-native";

import { radius, touchTarget } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
  color?: string;
  variant?: "ghost" | "surface" | "primary";
  style?: ViewStyle;
  badge?: number;
};

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 22,
  color,
  variant = "ghost",
  style,
  badge,
}: IconButtonProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const iconColor =
    color ?? (variant === "primary" ? colors.ctaForeground : colors.foreground);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "surface" && styles.surface,
        variant === "primary" && styles.primary,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={iconColor} />
      {badge !== undefined && badge > 0 ? (
        <View style={styles.badge} accessibilityElementsHidden />
      ) : null}
    </Pressable>
  );
}

function createStyles({ colors, shadows }: ThemeStyleTokens) {
  return StyleSheet.create({
    base: {
      width: touchTarget,
      height: touchTarget,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderRadius: radius.full,
    },
    surface: {
      backgroundColor: colors.surface,
      ...shadows.sm,
    },
    primary: {
      backgroundColor: colors.cta,
    },
    pressed: {
      opacity: 0.75,
    },
    badge: {},
  });
}

import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { colors, radius, shadows, touchTarget } from "@/constants/theme";

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
        <View style={styles.badge} accessibilityElementsHidden>
          {/* badge rendered by parent if needed */}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touchTarget,
    height: touchTarget,
    alignItems: "center",
    justifyContent: "center",
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

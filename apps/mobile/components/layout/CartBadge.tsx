import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius, touchTarget } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useCart } from "@/providers/cart-context";
import { useTheme } from "@/providers/theme-context";

type CartBadgeProps = {
  onPress?: () => void;
  color?: string;
};

export function CartBadge({ onPress, color }: CartBadgeProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { itemCount } = useCart();
  const label = itemCount > 0 ? `Cart, ${itemCount} items` : "Cart";
  const iconColor = color ?? colors.foreground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons name="cart-outline" size={24} color={iconColor} />
      {itemCount > 0 ? (
        <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no">
          <Text style={styles.badgeText}>{itemCount > 99 ? "99+" : itemCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function createStyles({ colors }: { colors: ReturnType<typeof useTheme>["colors"] }) {
  return StyleSheet.create({
    button: {
      width: touchTarget,
      height: touchTarget,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    pressed: {
      opacity: 0.7,
    },
    badge: {
      position: "absolute" as const,
      top: 4,
      right: 2,
      minWidth: 18,
      height: 18,
      borderRadius: radius.full,
      backgroundColor: colors.cta,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 4,
    },
    badgeText: {
      color: colors.ctaForeground,
      fontSize: 10,
      fontWeight: "700" as const,
    },
  });
}

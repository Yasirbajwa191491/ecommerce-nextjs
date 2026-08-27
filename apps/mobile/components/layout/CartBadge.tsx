import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, touchTarget } from "@/constants/theme";
import { useCart } from "@/providers/cart-context";

type CartBadgeProps = {
  onPress?: () => void;
  color?: string;
};

export function CartBadge({ onPress, color = colors.foreground }: CartBadgeProps) {
  const { itemCount } = useCart();
  const label = itemCount > 0 ? `Cart, ${itemCount} items` : "Cart";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons name="cart-outline" size={24} color={color} />
      {itemCount > 0 ? (
        <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no">
          <Text style={styles.badgeText}>{itemCount > 99 ? "99+" : itemCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: touchTarget,
    height: touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: colors.cta,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.ctaForeground,
    fontSize: 10,
    fontWeight: "700",
  },
});

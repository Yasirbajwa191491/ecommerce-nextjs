import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, shadows, spacing, touchTarget, typography } from "@/constants/theme";
import { useCart } from "@/providers/cart-context";

const TAB_CONFIG: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }
> = {
  index: { label: "Home", icon: "home-outline", iconActive: "home" },
  shop: { label: "Shop", icon: "grid-outline", iconActive: "grid" },
  ai: { label: "AI", icon: "sparkles-outline", iconActive: "sparkles" },
  orders: { label: "Orders", icon: "receipt-outline", iconActive: "receipt" },
  cart: { label: "Cart", icon: "cart-outline", iconActive: "cart" },
};

export function PremiumTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { itemCount } = useCart();
  const bottomInset = Platform.OS === "android" ? Math.max(insets.bottom, spacing.xs) : insets.bottom;

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomInset }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name] ?? {
            label: route.name,
            icon: "ellipse-outline" as const,
            iconActive: "ellipse" as const,
          };
          const isAi = route.name === "ai";

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const color = isFocused ? colors.primary : colors.muted;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? config.label}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tab,
                isAi && styles.aiTab,
                pressed && styles.pressed,
              ]}
            >
              {isAi ? (
                <View style={[styles.aiIconWrap, isFocused && styles.aiIconWrapActive]}>
                  <Ionicons
                    name={isFocused ? config.iconActive : config.icon}
                    size={20}
                    color={isFocused ? colors.primaryForeground : colors.primary}
                  />
                </View>
              ) : (
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={isFocused ? config.iconActive : config.icon}
                    size={21}
                    color={color}
                  />
                  {route.name === "cart" && itemCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {itemCount > 99 ? "99+" : itemCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
              <Text style={[styles.label, isFocused && styles.labelActive, isAi && styles.aiLabel]}>
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    ...shadows.tabBar,
  },
  bar: {
    flexDirection: "row",
    paddingTop: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: spacing.xs,
    minHeight: touchTarget + 4,
  },
  aiTab: {
    marginTop: -2,
  },
  pressed: {
    opacity: 0.8,
  },
  iconWrap: {
    position: "relative",
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  aiIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  aiIconWrapActive: {
    backgroundColor: colors.primary,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: {
    color: colors.primaryForeground,
    fontSize: 9,
    fontWeight: "700",
  },
  label: {
    fontSize: typography.xs,
    fontWeight: "500",
    color: colors.muted,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  aiLabel: {
    fontWeight: "600",
  },
});

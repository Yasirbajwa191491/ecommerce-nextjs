import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, shadows, sizes, spacing, touchTarget, typography } from "@/constants/theme";
import { useCart } from "@/providers/cart-context";

const HIDDEN_TAB_ROUTES = new Set(["orders"]);
const TAB_CONFIG: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }
> = {
  index: { label: "Home", icon: "home-outline", iconActive: "home" },
  shop: { label: "Shop", icon: "grid-outline", iconActive: "grid" },
  ai: { label: "AI", icon: "sparkles-outline", iconActive: "sparkles" },
  cart: { label: "Cart", icon: "cart-outline", iconActive: "cart" },
  track: { label: "Track", icon: "locate-outline", iconActive: "locate" },
};

export function PremiumTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { itemCount } = useCart();
  const bottomInset = Platform.OS === "android" ? Math.max(insets.bottom, spacing.xs) : insets.bottom;

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomInset }]}>
      <View style={styles.bar}>
        {state.routes
          .filter((route) => !HIDDEN_TAB_ROUTES.has(route.name))
          .map((route) => {
            const { options } = descriptors[route.key];
            const isFocused = state.routes[state.index]?.key === route.key;
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
            const cartLabel =
              route.name === "cart" && itemCount > 0
                ? `${config.label}, ${itemCount} items`
                : config.label;

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? cartLabel}
                onPress={onPress}
                style={({ pressed }) => [styles.tab, isAi && styles.aiTab, pressed && styles.pressed]}
              >
                {isAi ? (
                  <View style={[styles.aiIconWrap, isFocused && styles.aiIconWrapActive]}>
                    <Ionicons
                      name={isFocused ? config.iconActive : config.icon}
                      size={sizes.iconMd}
                      color={isFocused ? colors.primaryForeground : colors.primary}
                    />
                  </View>
                ) : (
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name={isFocused ? config.iconActive : config.icon}
                      size={sizes.iconMd}
                      color={color}
                    />
                    {route.name === "cart" && itemCount > 0 ? (
                      <View style={styles.badge} accessibilityElementsHidden>
                        <Text style={styles.badgeText}>{itemCount > 99 ? "99+" : itemCount}</Text>
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
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  aiIconWrap: {
    width: 36,
    height: 36,
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
    top: -5,
    right: -9,
    minWidth: 18,
    height: 18,
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
    fontSize: 10,
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

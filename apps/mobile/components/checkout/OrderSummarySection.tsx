import { formatCurrencyAmount } from "@ecommerce/shared";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";

import { ColorSwatch } from "@/components/cart/ColorSwatch";
import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";
import type { CartLineLike, PricedCartItem } from "@/lib/cart-lines";

type OrderSummarySectionProps = {
  cart: CartLineLike[];
  getPricedItem: (item: CartLineLike) => PricedCartItem | undefined;
  currency?: string;
};

export function OrderSummarySection({
  cart,
  getPricedItem,
  currency = "USD",
}: OrderSummarySectionProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createOrderSummarySectionStyles);
  const [expanded, setExpanded] = useState(false);
  const previewItems = expanded ? cart : cart.slice(0, 2);
  const hiddenCount = Math.max(0, cart.length - 2);

  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={styles.header}
      >
        <Text style={styles.sectionTitle}>Order summary</Text>
        <View style={styles.headerRight}>
          <Text style={styles.itemCount}>
            {cart.length} item{cart.length === 1 ? "" : "s"}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.textSecondary}
          />
        </View>
      </Pressable>

      <View style={styles.items}>
        {previewItems.map((item) => {
          const priced = getPricedItem(item);
          const lineTotal = priced?.lineTotal ?? item.price * item.amount;
          return (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.thumbWrap}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <Ionicons name="image-outline" size={16} color={colors.muted} />
                  </View>
                )}
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyBadgeText}>{item.amount}</Text>
                </View>
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.color ? <ColorSwatch color={item.color} /> : null}
                {priced && priced.discountPercent > 0 ? (
                  <Text style={styles.discountNote}>-{priced.discountPercent}% applied</Text>
                ) : null}
              </View>
              <Text style={styles.itemPrice}>{formatCurrencyAmount(lineTotal, currency)}</Text>
            </View>
          );
        })}

        {!expanded && hiddenCount > 0 ? (
          <Text style={styles.moreText}>+{hiddenCount} more item{hiddenCount === 1 ? "" : "s"}</Text>
        ) : null}
      </View>
    </View>
  );
}

function createOrderSummarySectionStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    section: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    },
    sectionTitle: {
      ...textStyles.sectionTitle,
      color: colors.foreground,
    },
    headerRight: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.xs,
    },
    itemCount: {
      fontSize: typography.sm,
      color: colors.textSecondary,
    },
    items: {
      gap: spacing.md,
    },
    itemRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.md,
    },
    thumbWrap: {
      width: 56,
      height: 56,
      borderRadius: radius.sm,
      overflow: "hidden" as const,
      backgroundColor: colors.borderLight,
      position: "relative" as const,
    },
    thumb: {
      width: "100%" as const,
      height: "100%" as const,
    },
    thumbPlaceholder: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    qtyBadge: {
      position: "absolute" as const,
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: radius.full,
      backgroundColor: colors.foreground,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 4,
    },
    qtyBadgeText: {
      fontSize: 10,
      fontWeight: "700" as const,
      color: colors.surface,
    },
    itemDetails: {
      flex: 1,
      gap: 2,
    },
    itemName: {
      fontSize: typography.sm,
      fontWeight: "500" as const,
      color: colors.foreground,
      lineHeight: 18,
    },
    discountNote: {
      fontSize: typography.xs,
      color: colors.success,
      fontWeight: "600" as const,
    },
    itemPrice: {
      fontSize: typography.sm,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    moreText: {
      fontSize: typography.sm,
      color: colors.primary,
      fontWeight: "500" as const,
    },
  });
}

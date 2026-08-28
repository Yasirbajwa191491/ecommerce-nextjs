import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, Text, View, StyleSheet } from "react-native";

import { ColorSwatch } from "@/components/cart/ColorSwatch";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";
import type { CartLineLike } from "@/lib/cart-lines";

type CartLineItemProps = {
  item: CartLineLike;
  lineTotal?: number;
  currency?: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
};

export function CartLineItem({
  item,
  lineTotal,
  currency,
  onIncrement,
  onDecrement,
  onRemove,
}: CartLineItemProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createCartLineItemStyles);
  const displayTotal = lineTotal ?? item.price * item.amount;

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${item.name}`}
        onPress={() => router.push(`/product/${item.productId}`)}
        style={styles.imageWrap}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={24} color={colors.muted} />
          </View>
        )}
      </Pressable>

      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        {item.color ? <ColorSwatch color={item.color} /> : null}
        <PriceDisplay price={displayTotal} currency={currency ?? item.currency} size="md" />

        <View style={styles.actions}>
          <QuantityStepper
            value={item.amount}
            min={1}
            max={item.max}
            onDecrement={onDecrement}
            onIncrement={onIncrement}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.name}`}
            hitSlop={8}
            onPress={onRemove}
            style={styles.removeBtn}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function createCartLineItemStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    container: {
      flexDirection: "row" as const,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.md,
    },
    imageWrap: {
      width: 96,
      height: 96,
      borderRadius: radius.md,
      overflow: "hidden" as const,
      backgroundColor: colors.borderLight,
    },
    image: {
      width: "100%" as const,
      height: "100%" as const,
    },
    imagePlaceholder: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    details: {
      flex: 1,
      gap: 4,
    },
    name: {
      ...textStyles.cardTitle,
      fontSize: typography.base,
      lineHeight: 20,
      color: colors.foreground,
    },
    actions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginTop: spacing.sm,
    },
    removeBtn: {
      minHeight: 44,
      justifyContent: "center" as const,
      paddingHorizontal: spacing.sm,
    },
    removeText: {
      fontSize: typography.sm,
      color: colors.destructive,
      fontWeight: "500" as const,
    },
  });
}

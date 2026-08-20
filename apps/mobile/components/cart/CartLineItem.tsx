import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ColorSwatch } from "@/components/cart/ColorSwatch";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";
import type { CartLineLike } from "@/lib/cart-lines";

type CartLineItemProps = {
  item: CartLineLike;
  lineTotal?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
};

export function CartLineItem({
  item,
  lineTotal,
  onIncrement,
  onDecrement,
  onRemove,
}: CartLineItemProps) {
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
        <PriceDisplay price={displayTotal} size="md" />

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

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  imageWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.borderLight,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  details: {
    flex: 1,
    gap: 4,
  },
  name: {
    ...textStyles.cardTitle,
    fontSize: typography.base,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  removeBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  removeText: {
    fontSize: typography.sm,
    color: colors.destructive,
    fontWeight: "500",
  },
});

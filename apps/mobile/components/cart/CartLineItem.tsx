import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PriceDisplay } from "@/components/ui/PriceDisplay";
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
      <Pressable onPress={() => router.push(`/product/${item.productId}`)} style={styles.imageWrap}>
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
        {item.color ? (
          <Text style={styles.variant}>{item.color}</Text>
        ) : null}
        <PriceDisplay price={displayTotal} size="sm" />

        <View style={styles.actions}>
          <View style={styles.quantityControl}>
            <Pressable accessibilityLabel="Decrease" hitSlop={8} onPress={onDecrement} style={styles.qtyBtn}>
              <Ionicons name="remove" size={18} color={colors.foreground} />
            </Pressable>
            <Text style={styles.qtyText}>{item.amount}</Text>
            <Pressable
              accessibilityLabel="Increase"
              hitSlop={8}
              onPress={onIncrement}
              style={styles.qtyBtn}
              disabled={item.amount >= item.max}
            >
              <Ionicons
                name="add"
                size={18}
                color={item.amount >= item.max ? colors.muted : colors.foreground}
              />
            </Pressable>
          </View>

          <Pressable accessibilityLabel="Remove" hitSlop={8} onPress={onRemove} style={styles.removeBtn}>
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
    borderRadius: radius.lg,
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
  },
  variant: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 2,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    minWidth: 28,
    textAlign: "center",
    fontSize: typography.sm,
    fontWeight: "600",
  },
  removeBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  removeText: {
    fontSize: typography.sm,
    color: colors.destructive,
    fontWeight: "500",
  },
});

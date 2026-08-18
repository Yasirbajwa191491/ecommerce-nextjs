import { formatCurrencyAmount } from "@ecommerce/shared";
import { StyleSheet, Text, View } from "react-native";

import { spacing, textStyles, typography } from "@/constants/theme";

type PriceDisplayProps = {
  price: number;
  originalPrice?: number;
  size?: "sm" | "md" | "lg";
};

export function PriceDisplay({ price, originalPrice, size = "md" }: PriceDisplayProps) {
  const hasDiscount = originalPrice !== undefined && originalPrice > price;

  return (
    <View style={styles.row}>
      <Text style={[styles.price, size === "lg" && styles.priceLg, size === "sm" && styles.priceSm]}>
        {formatCurrencyAmount(price)}
      </Text>
      {hasDiscount ? (
        <Text style={styles.original}>{formatCurrencyAmount(originalPrice)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  price: {
    ...textStyles.price,
  },
  priceLg: {
    ...textStyles.priceLarge,
  },
  priceSm: {
    fontSize: typography.sm,
    fontWeight: "700",
  },
  original: {
    ...textStyles.priceStrike,
  },
});

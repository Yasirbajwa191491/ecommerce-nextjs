import { formatCurrencyAmount } from "@ecommerce/shared";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, textStyles, typography } from "@/constants/theme";
import { resolveProductCurrency } from "@/lib/product-display";

type PriceDisplayProps = {
  price: number;
  originalPrice?: number;
  currency?: string | null;
  size?: "sm" | "md" | "lg";
};

export function PriceDisplay({
  price,
  originalPrice,
  currency,
  size = "md",
}: PriceDisplayProps) {
  const hasDiscount = originalPrice !== undefined && originalPrice > price;
  const code = resolveProductCurrency(currency);

  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.price,
          hasDiscount && styles.priceSale,
          size === "lg" && (hasDiscount ? styles.priceLgSale : styles.priceLg),
          size === "sm" && styles.priceSm,
          size === "sm" && hasDiscount && styles.priceSmSale,
        ]}
      >
        {formatCurrencyAmount(price, code)}
      </Text>
      {hasDiscount ? (
        <Text style={styles.original}>{formatCurrencyAmount(originalPrice, code)}</Text>
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
  priceSale: {
    ...textStyles.priceSale,
  },
  priceLg: {
    ...textStyles.priceLarge,
  },
  priceLgSale: {
    ...textStyles.priceLargeSale,
  },
  priceSm: {
    fontSize: typography.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  priceSmSale: {
    color: colors.discount,
  },
  original: {
    ...textStyles.priceStrike,
  },
});

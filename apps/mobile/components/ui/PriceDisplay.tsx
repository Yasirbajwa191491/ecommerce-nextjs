import { formatCurrencyAmount } from "@ecommerce/shared";
import { Text, View, StyleSheet } from "react-native";

import { spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
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
  const styles = useThemedStyles(createStyles);
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

function createStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: "row" as const,
      alignItems: "baseline" as const,
      gap: spacing.sm,
      flexWrap: "wrap" as const,
    },
    price: {
      ...textStyles.price,
      color: colors.foreground,
    },
    priceSale: {
      ...textStyles.priceSale,
      color: colors.discount,
    },
    priceLg: {
      ...textStyles.priceLarge,
      color: colors.foreground,
    },
    priceLgSale: {
      ...textStyles.priceLargeSale,
      color: colors.discount,
    },
    priceSm: {
      fontSize: typography.sm,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    priceSmSale: {
      color: colors.discount,
    },
    original: {
      ...textStyles.priceStrike,
      color: colors.muted,
    },
  });
}

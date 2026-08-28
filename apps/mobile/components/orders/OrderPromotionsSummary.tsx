import { formatCurrencyAmount } from "@ecommerce/shared";
import { StyleSheet, Text, View } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";

export type OrderPromotionSummary = {
  promotionName: string;
  promotionDescription?: string;
  freeQuantity: number;
  savingsAmount: number;
};

type OrderPromotionsSummaryProps = {
  promotions: OrderPromotionSummary[];
  currency: string;
};

export function OrderPromotionsSummary({ promotions, currency }: OrderPromotionsSummaryProps) {
  const styles = useThemedStyles(createOrderPromotionsSummaryStyles);

  if (!promotions.length) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Promotions applied</Text>
      {promotions.map((promo, index) => (
        <Text key={`${promo.promotionName}-${index}`} style={styles.line}>
          <Text style={styles.name}>{promo.promotionName}</Text>
          <Text style={styles.meta}>
            {" "}
            · {promo.freeQuantity} free · saved{" "}
            {formatCurrencyAmount(promo.savingsAmount, currency)}
          </Text>
        </Text>
      ))}
    </View>
  );
}

function createOrderPromotionsSummaryStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.successMuted,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(16, 185, 129, 0.35)",
    },
    title: {
      fontSize: typography.sm,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    line: {
      fontSize: typography.sm,
    },
    name: {
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    meta: {
      color: colors.textSecondary,
    },
  });
}

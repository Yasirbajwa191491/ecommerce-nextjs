import { formatCurrencyAmount } from "@ecommerce/shared";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";

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

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ECFDF5",
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#A7F3D0",
  },
  title: {
    fontSize: typography.sm,
    fontWeight: "700",
    color: "#065F46",
  },
  line: {
    fontSize: typography.sm,
  },
  name: {
    fontWeight: "600",
    color: colors.foreground,
  },
  meta: {
    color: colors.textSecondary,
  },
});

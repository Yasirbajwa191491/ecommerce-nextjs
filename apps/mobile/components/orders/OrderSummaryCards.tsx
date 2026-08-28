import { formatCurrencyAmount } from "@ecommerce/shared";
import { StyleSheet, Text, View } from "react-native";

import {
  PaymentMethodBadge,
  PaymentStatusBadge,
} from "@/components/orders/OrderStatusBadges";
import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { formatOrderDateTime, type PaymentMethod, type PaymentStatus } from "@/lib/order-display";

type OrderSummaryCardsProps = {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  total: number;
  currency: string;
  createdAt: number;
  paidAt?: number;
};

export function OrderSummaryCards({
  paymentMethod,
  paymentStatus,
  total,
  currency,
  createdAt,
  paidAt,
}: OrderSummaryCardsProps) {
  const styles = useThemedStyles(createOrderSummaryCardsStyles);

  return (
    <View style={styles.grid}>
      <View style={styles.card}>
        <Text style={styles.label}>Payment</Text>
        <View style={styles.badgeRow}>
          <PaymentMethodBadge method={paymentMethod} />
          <PaymentStatusBadge status={paymentStatus} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Total amount</Text>
        <Text style={styles.totalValue}>{formatCurrencyAmount(total, currency)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Order date</Text>
        <Text style={styles.value}>{formatOrderDateTime(createdAt)}</Text>
      </View>

      {paidAt ? (
        <View style={styles.card}>
          <Text style={styles.label}>Payment completed</Text>
          <Text style={styles.value}>{formatOrderDateTime(paidAt)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function createOrderSummaryCardsStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    grid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing.md,
    },
    card: {
      flexGrow: 1,
      flexBasis: "46%" as const,
      minWidth: 140,
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    label: {
      fontSize: typography.sm,
      color: colors.textSecondary,
    },
    badgeRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing.sm,
    },
    totalValue: {
      fontSize: typography.lg,
      fontWeight: "700" as const,
      color: colors.primary,
    },
    value: {
      fontSize: typography.sm,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
  });
}

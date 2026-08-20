import { formatCurrencyAmount } from "@ecommerce/shared";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";

type PriceBreakdownProps = {
  subtotal: number;
  discountTotal: number;
  shipping?: number;
  deliveryCharge?: number;
  deliveryMethod?: string;
  deliveryMethodLabel?: string;
  tax?: number;
  total: number;
  currency?: string;
  isLoading?: boolean;
};

export function PriceBreakdown({
  subtotal,
  discountTotal,
  shipping = 0,
  deliveryCharge = 0,
  deliveryMethod,
  deliveryMethodLabel,
  tax = 0,
  total,
  currency = "USD",
  isLoading = false,
}: PriceBreakdownProps) {
  const placeholder = "…";
  const isStandardDelivery = !deliveryMethod || deliveryMethod === "standard";
  const shippingLabel = isStandardDelivery
    ? (deliveryMethodLabel ?? "Shipping")
    : "Shipping";

  return (
    <View style={styles.section}>
      <Text style={textStyles.sectionTitle}>Price breakdown</Text>
      <View style={styles.rows}>
        <View style={styles.row}>
          <Text style={styles.label}>Subtotal</Text>
          <Text style={styles.value}>
            {isLoading ? placeholder : formatCurrencyAmount(subtotal, currency)}
          </Text>
        </View>

        {discountTotal > 0 ? (
          <View style={styles.row}>
            <Text style={styles.label}>Discount</Text>
            <Text style={styles.discount}>
              -{isLoading ? placeholder : formatCurrencyAmount(discountTotal, currency)}
            </Text>
          </View>
        ) : null}

        {isStandardDelivery ? (
          <View style={styles.row}>
            <Text style={styles.label}>{shippingLabel}</Text>
            <Text style={[styles.value, shipping === 0 && styles.freeValue]}>
              {isLoading
                ? placeholder
                : shipping === 0
                  ? "Free"
                  : formatCurrencyAmount(shipping, currency)}
            </Text>
          </View>
        ) : (
          <View style={styles.row}>
            <Text style={styles.label}>{deliveryMethodLabel ?? "Delivery"}</Text>
            <Text style={[styles.value, deliveryCharge === 0 && styles.freeValue]}>
              {isLoading
                ? placeholder
                : deliveryCharge === 0
                  ? "Free"
                  : formatCurrencyAmount(deliveryCharge, currency)}
            </Text>
          </View>
        )}

        <View style={styles.row}>
          <Text style={styles.label}>Tax</Text>
          <Text style={styles.value}>
            {isLoading ? placeholder : formatCurrencyAmount(tax, currency)}
          </Text>
        </View>

        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {isLoading ? placeholder : formatCurrencyAmount(total, currency)}
          </Text>
        </View>

        {discountTotal > 0 && !isLoading ? (
          <Text style={styles.savings}>
            You saved {formatCurrencyAmount(discountTotal, currency)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  rows: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  value: {
    fontSize: typography.sm,
    fontWeight: "500",
    color: colors.foreground,
  },
  freeValue: {
    color: colors.success,
    fontWeight: "700",
  },
  discount: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.success,
  },
  totalRow: {
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  totalLabel: {
    fontSize: typography.lg,
    fontWeight: "700",
    color: colors.foreground,
  },
  totalValue: {
    fontSize: typography.xl,
    fontWeight: "800",
    color: colors.foreground,
  },
  savings: {
    fontSize: typography.sm,
    color: colors.success,
    fontWeight: "600",
    textAlign: "right",
  },
});

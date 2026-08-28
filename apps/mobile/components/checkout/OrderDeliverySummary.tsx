import { formatCurrencyAmount } from "@ecommerce/shared";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";

type OrderDeliverySummaryProps = {
  deliveryMethod?: string;
  deliveryMethodLabel?: string;
  deliveryEstimate?: string;
  deliveryCharge?: number;
  shipping?: number;
  currency?: string;
};

export function OrderDeliverySummary({
  deliveryMethod,
  deliveryMethodLabel,
  deliveryEstimate,
  deliveryCharge = 0,
  shipping = 0,
  currency = "USD",
}: OrderDeliverySummaryProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createOrderDeliverySummaryStyles);
  const isStandardDelivery = !deliveryMethod || deliveryMethod === "standard";
  const displayCharge = isStandardDelivery ? shipping : deliveryCharge;

  if (!deliveryMethodLabel && displayCharge === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="car-outline" size={18} color={colors.primary} />
        <Text style={styles.title}>Shipping & delivery</Text>
      </View>
      {deliveryMethodLabel ? (
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{deliveryMethodLabel}</Text>
            {deliveryEstimate ? (
              <Text style={styles.estimate}>Est. {deliveryEstimate}</Text>
            ) : null}
          </View>
          <Text style={[styles.charge, displayCharge === 0 && styles.freeCharge]}>
            {displayCharge === 0 ? "Free" : formatCurrencyAmount(displayCharge, currency)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function createOrderDeliverySummaryStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    card: {
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.borderLight,
      backgroundColor: colors.borderLight,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
    },
    title: {
      fontSize: typography.sm,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    row: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      justifyContent: "space-between" as const,
      gap: spacing.md,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    label: {
      fontSize: typography.sm,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    estimate: {
      fontSize: typography.sm,
      color: colors.textSecondary,
    },
    charge: {
      fontSize: typography.sm,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    freeCharge: {
      color: colors.success,
    },
  });
}

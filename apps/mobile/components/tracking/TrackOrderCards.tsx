import { formatCurrencyAmount } from "@ecommerce/shared";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { OrderProgressTimeline } from "@/components/orders/OrderProgressTimeline";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadges";
import { Button } from "@/components/ui/Button";
import {
  createTextStyles,
  radius,
  spacing,
  typography,
  type ColorPalette,
} from "@/constants/theme";
import { formatOrderDateTime, type OrderStatus } from "@/lib/order-display";
import { useTheme } from "@/providers/theme-context";

function useTrackCardStyles() {
  const { colors, textStyles } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, textStyles),
    [colors, textStyles]
  );
  return { colors, styles };
}

export type TrackedOrderSummary = {
  orderNumber: string;
  status: OrderStatus;
  total: number;
  currency: string;
  createdAt: number;
};

type CustomerOrderCardProps = {
  order: TrackedOrderSummary;
  customerEmail?: string;
  customerPhone?: string;
};

export function CustomerOrderCard({
  order,
  customerEmail,
  customerPhone,
}: CustomerOrderCardProps) {
  const { styles } = useTrackCardStyles();
  const openDetails = () => {
    router.push({
      pathname: "/order/[id]",
      params: {
        id: order.orderNumber,
        orderNumber: order.orderNumber,
        source: "track",
        email: customerEmail ?? "",
        phone: customerPhone ?? "",
      },
    });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNumber}, ${order.status}`}
      onPress={openDetails}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.orderLabel}>Order #{order.orderNumber}</Text>
          <Text style={styles.date}>{formatOrderDateTime(order.createdAt)}</Text>
        </View>
        <OrderStatusBadge status={order.status} />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.total}>{formatCurrencyAmount(order.total, order.currency)}</Text>
      </View>

      <View style={styles.timeline}>
        <OrderProgressTimeline status={order.status} />
      </View>

      <Button
        label="View order"
        variant="outline"
        size="sm"
        onPress={openDetails}
        accessibilityLabel={`View order ${order.orderNumber}`}
      />
    </Pressable>
  );
}

type TrackOrderResultCardProps = {
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: number;
  paidAt?: number;
  itemCount?: number;
  customerEmail?: string;
  accessToken?: string;
};

export function TrackOrderResultCard({
  orderNumber,
  status,
  paymentMethod,
  paymentStatus,
  total,
  currency,
  createdAt,
  paidAt,
  itemCount,
  customerEmail,
  accessToken,
}: TrackOrderResultCardProps) {
  const { styles } = useTrackCardStyles();
  const openDetails = () => {
    router.push({
      pathname: "/order/[id]",
      params: {
        id: orderNumber,
        orderNumber,
        source: "track",
        email: customerEmail ?? "",
        accessToken: accessToken ?? "",
      },
    });
  };

  return (
    <View style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <View style={styles.headerText}>
          <Text style={styles.metaLabel}>Order found</Text>
          <Text style={styles.orderNumber}>{orderNumber}</Text>
          <Text style={styles.date}>{formatOrderDateTime(createdAt)}</Text>
        </View>
        <OrderStatusBadge status={status} />
      </View>

      <Text style={styles.progressTitle}>Order progress</Text>
      <OrderProgressTimeline status={status} />

      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Payment</Text>
          <Text style={styles.summaryValue}>
            {paymentMethod} · {paymentStatus}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.total}>{formatCurrencyAmount(total, currency)}</Text>
        </View>
        {itemCount !== undefined ? (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Items</Text>
            <Text style={styles.summaryValue}>
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </Text>
          </View>
        ) : null}
        {paidAt ? (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Paid</Text>
            <Text style={styles.summaryValue}>{formatOrderDateTime(paidAt)}</Text>
          </View>
        ) : null}
      </View>

      <Button
        label="View full details"
        fullWidth
        onPress={openDetails}
        accessibilityLabel={`View full details for order ${orderNumber}`}
      />
    </View>
  );
}

export function TrackOrderSkeleton() {
  const { colors, styles } = useTrackCardStyles();
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonRow}>
        <Ionicons name="hourglass-outline" size={20} color={colors.muted} />
        <Text style={styles.skeletonText}>Loading order details…</Text>
      </View>
    </View>
  );
}

function createStyles(
  colors: ColorPalette,
  textStyles: ReturnType<typeof createTextStyles>
) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardPressed: {
    backgroundColor: colors.primaryMuted,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  orderLabel: {
    ...textStyles.sectionTitle,
    fontSize: typography.base,
  },
  orderNumber: {
    ...textStyles.sectionTitle,
  },
  date: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  total: {
    fontSize: typography.lg,
    fontWeight: "700",
    color: colors.primary,
  },
  timeline: {
    paddingTop: spacing.xs,
  },
  resultCard: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primarySubtle,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  metaLabel: {
    fontSize: typography.xs,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  progressTitle: {
    ...textStyles.sectionTitle,
    fontSize: typography.base,
  },
  summaryGrid: {
    gap: spacing.md,
  },
  summaryItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  summaryLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.foreground,
    textTransform: "capitalize",
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  skeletonText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
});
}

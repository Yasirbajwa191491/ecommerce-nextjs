import { Ionicons } from "@expo/vector-icons";
import { useAction, useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OrderDeliverySummary } from "@/components/checkout/OrderDeliverySummary";
import { PriceBreakdown } from "@/components/checkout/PriceBreakdown";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Header } from "@/components/layout/Header";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { OrderItemsSection } from "@/components/orders/OrderItemsSection";
import { OrderProgressTimeline } from "@/components/orders/OrderProgressTimeline";
import { OrderPromotionsSummary } from "@/components/orders/OrderPromotionsSummary";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadges";
import { OrderSummaryCards } from "@/components/orders/OrderSummaryCards";
import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { loadLastOrderInfo } from "@/lib/checkout-customer-storage";
import { api } from "@/lib/convex-api";
import { formatOrderDateTime, getPaymentMethodLabel, type OrderStatus, type PaymentMethod, type PaymentStatus } from "@/lib/order-display";

type LoadedPublicOrder = {
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: number;
  paidAt?: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  subtotal: number;
  tax: number;
  discountTotal?: number;
  shipping: number;
  deliveryCharge?: number;
  deliveryMethod?: string;
  deliveryMethodLabel?: string;
  deliveryEstimate?: string;
  items: {
    productId: string;
    productName: string;
    color: string;
    quantity: number;
    lineTotal: number;
  }[];
  promotions: {
    promotionName: string;
    promotionDescription?: string;
    freeQuantity: number;
    savingsAmount: number;
  }[];
  statusHistory: {
    event: string;
    description: string;
    createdAt: number;
  }[];
};

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useLayoutMetrics();
  const params = useLocalSearchParams<{
    id?: string;
    orderNumber?: string;
    source?: string;
  }>();

  const usePublicTracking = params.source === "track";

  const [storedOrder, setStoredOrder] = useState<{
    orderNumber: string | null;
    email: string | null;
  }>({ orderNumber: null, email: null });

  const [publicOrder, setPublicOrder] = useState<LoadedPublicOrder | null>(null);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicNotFound, setPublicNotFound] = useState(false);

  const getPublicOrderDetail = useAction(api.orderTracking.getPublicOrderDetail);

  useEffect(() => {
    void loadLastOrderInfo().then(setStoredOrder);
  }, []);

  const orderNumber =
    (typeof params.orderNumber === "string" ? params.orderNumber : null) ??
    storedOrder.orderNumber;

  const customerEmail = storedOrder.email ?? undefined;

  const orderData = useQuery(
    api.orders.getOrderByNumber,
    !usePublicTracking && orderNumber ? { orderNumber, customerEmail } : "skip"
  );

  useEffect(() => {
    if (!usePublicTracking || !orderNumber) return;

    let cancelled = false;

    void (async () => {
      setPublicLoading(true);
      setPublicNotFound(false);
      setPublicOrder(null);

      try {
        const result = await getPublicOrderDetail({ orderNumber });
        if (cancelled) return;
        if (result.found) {
          setPublicOrder(result.order as LoadedPublicOrder);
          setPublicNotFound(false);
        } else {
          setPublicNotFound(true);
        }
      } catch {
        if (!cancelled) setPublicNotFound(true);
      } finally {
        if (!cancelled) setPublicLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getPublicOrderDetail, orderNumber, usePublicTracking]);

  const isLoading = usePublicTracking
    ? Boolean(orderNumber && publicLoading)
    : Boolean(orderNumber && orderData === undefined);

  const order = usePublicTracking ? publicOrder : orderData?.order;
  const items = usePublicTracking
    ? (publicOrder?.items ?? []).map((item, index) => ({
        _id: `${item.productId}-${index}`,
        productName: item.productName,
        color: item.color,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        warrantySummary: undefined,
        isPromotionGift: false,
      }))
    : (orderData?.items ?? []);
  const promotions = usePublicTracking
    ? (publicOrder?.promotions ?? [])
    : (orderData?.promotions ?? []);

  const notFound = usePublicTracking
    ? publicNotFound || (!publicLoading && orderNumber && !publicOrder)
    : !isLoading && !order;

  const paymentLabel = getPaymentMethodLabel(order?.paymentMethod);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Header title="Order details" showBack showSearch={false} showCart={false} />

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading order…</Text>
          </View>
        ) : notFound || !order ? (
          <EmptyState
            icon="receipt-outline"
            title="Order not found"
            description="We couldn't find an order with those details. Please check your information and try again."
          />
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              {
                paddingHorizontal: horizontalPadding,
                paddingBottom: insets.bottom + spacing["2xl"],
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerCard}>
              <View style={styles.headerTop}>
                <View style={styles.headerText}>
                  <Text style={styles.metaLabel}>Order tracking</Text>
                  <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                  <Text style={styles.placedAt}>
                    Placed on {formatOrderDateTime(order.createdAt)}
                  </Text>
                </View>
                <OrderStatusBadge status={order.status as OrderStatus} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Order progress</Text>
              <OrderProgressTimeline status={order.status as OrderStatus} />
              <OrderSummaryCards
                paymentMethod={order.paymentMethod as PaymentMethod}
                paymentStatus={order.paymentStatus as PaymentStatus}
                total={order.total}
                currency={order.currency}
                createdAt={order.createdAt}
                paidAt={order.paidAt}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Customer information</Text>
              <View style={styles.infoBlock}>
                <Text style={styles.infoValue}>{order.customerName}</Text>
                <Text style={styles.contact}>{order.customerEmail}</Text>
                <Text style={styles.contact}>{order.customerPhone}</Text>
              </View>
            </View>

            <OrderItemsSection items={items} currency={order.currency} />

            <OrderPromotionsSummary
              promotions={promotions.map((promo) => ({
                promotionName: promo.promotionName,
                promotionDescription: promo.promotionDescription,
                freeQuantity: promo.freeQuantity,
                savingsAmount: promo.savingsAmount,
              }))}
              currency={order.currency}
            />

            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Payment</Text>
                <Text style={styles.infoValue}>{paymentLabel}</Text>
              </View>
              <View style={styles.divider} />
              <OrderDeliverySummary
                deliveryMethod={order.deliveryMethod}
                deliveryMethodLabel={order.deliveryMethodLabel}
                deliveryEstimate={order.deliveryEstimate}
                deliveryCharge={order.deliveryCharge}
                shipping={order.shipping}
                currency={order.currency}
              />
              <PriceBreakdown
                subtotal={order.subtotal}
                discountTotal={order.discountTotal ?? 0}
                shipping={order.shipping}
                deliveryCharge={order.deliveryCharge ?? 0}
                deliveryMethod={order.deliveryMethod}
                deliveryMethodLabel={order.deliveryMethodLabel}
                tax={order.tax}
                total={order.total}
                currency={order.currency}
              />
              <View style={styles.divider} />
              <View style={styles.infoBlock}>
                <View style={styles.infoHeader}>
                  <Ionicons name="location-outline" size={16} color={colors.primary} />
                  <Text style={styles.infoLabel}>Delivery to</Text>
                </View>
                <Text style={styles.address}>{order.customerAddress}</Text>
              </View>
              {"customerNotes" in order && order.customerNotes ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoLabel}>Order notes</Text>
                    <Text style={styles.address}>{order.customerNotes}</Text>
                  </View>
                </>
              ) : null}
              {usePublicTracking && publicOrder?.statusHistory?.length ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoBlock}>
                    <Text style={styles.cardTitle}>Status history</Text>
                    {publicOrder.statusHistory.map((entry) => (
                      <View key={`${entry.createdAt}-${entry.event}`} style={styles.historyRow}>
                        <Text style={styles.historyEvent}>{entry.description}</Text>
                        <Text style={styles.historyDate}>
                          {formatOrderDateTime(entry.createdAt)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  content: {
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  metaLabel: {
    fontSize: typography.xs,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  orderNumber: {
    ...textStyles.sectionTitle,
  },
  placedAt: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  cardTitle: {
    ...textStyles.sectionTitle,
    fontSize: typography.base,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  infoLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
  },
  infoBlock: {
    gap: spacing.xs,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  address: {
    fontSize: typography.sm,
    color: colors.foreground,
    lineHeight: 20,
  },
  contact: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  historyRow: {
    gap: 2,
    paddingVertical: spacing.xs,
  },
  historyEvent: {
    fontSize: typography.sm,
    color: colors.foreground,
    fontWeight: "500",
  },
  historyDate: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
});

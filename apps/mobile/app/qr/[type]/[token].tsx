import { Ionicons } from "@expo/vector-icons";
import { useAction, useQuery } from "convex/react";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OrderDeliverySummary } from "@/components/checkout/OrderDeliverySummary";
import { PriceBreakdown } from "@/components/checkout/PriceBreakdown";
import { EmptyState } from "@/components/feedback/EmptyState";
import { OfflineNotice } from "@/components/feedback/OfflineNotice";
import { Header } from "@/components/layout/Header";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { CopyOrderNumber } from "@/components/orders/CopyOrderNumber";
import { OrderItemsSection } from "@/components/orders/OrderItemsSection";
import { OrderProgressTimeline } from "@/components/orders/OrderProgressTimeline";
import { OrderPromotionsSummary } from "@/components/orders/OrderPromotionsSummary";
import {
  OrderStatusBadge,
  PaymentMethodBadge,
  PaymentStatusBadge,
} from "@/components/orders/OrderStatusBadges";
import { OrderSummaryCards } from "@/components/orders/OrderSummaryCards";
import { Button } from "@/components/ui/Button";
import { radius, spacing, typography } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { usePaymentSheetCheckout } from "@/hooks/usePaymentSheetCheckout";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { useTheme } from "@/providers/theme-context";
import { useToast } from "@/providers/toast-context";
import { api } from "@/lib/convex-api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { triggerHaptic } from "@/lib/haptics";
import { ensureOnlineNow } from "@/lib/network";
import {
  formatOrderDateTime,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/order-display";
import { formatCurrencyAmount } from "@ecommerce/shared";

type ResolveResult = {
  ok: boolean;
  code: string;
  message: string;
  type?: string;
  productId?: string;
  orderNumber?: string;
  amount?: number;
  currency?: string;
  order?: LiveOrder;
};

type LiveOrder = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  subtotal: number;
  tax: number;
  discountTotal?: number;
  shipping: number;
  deliveryCharge?: number;
  deliveryMethod?: string;
  deliveryMethodLabel?: string;
  deliveryEstimate?: string;
  currency: string;
  createdAt: number;
  paidAt?: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  items: Array<{
    productId: string;
    productName: string;
    color: string;
    quantity: number;
    lineTotal: number;
    isPromotionGift?: boolean;
    warrantySummary?: string;
  }>;
  promotions: Array<{
    promotionName: string;
    promotionDescription?: string;
    freeQuantity: number;
    savingsAmount: number;
  }>;
  statusHistory?: Array<{
    event: string;
    description: string;
    createdAt: number;
  }>;
};

function OrderTrackingLive({ token, initial }: { token: string; initial: LiveOrder }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useLayoutMetrics();
  const { showToast, showError } = useToast();
  const live = useQuery(api.qr.watchOrderFromQr, { token });
  const order: LiveOrder =
    live?.ok && live.order ? (live.order as LiveOrder) : initial;

  const shareUrl = useMemo(() => {
    const site = process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, "");
    if (site) return `${site}/qr/order/${encodeURIComponent(token)}`;
    return `ecommerce://qr/order/${encodeURIComponent(token)}`;
  }, [token]);

  const items = order.items.map((item, index) => ({
    _id: `${item.productId}-${index}`,
    productName: item.productName,
    color: item.color,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
    warrantySummary: item.warrantySummary,
    isPromotionGift: item.isPromotionGift,
  }));

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        title: `Order ${order.orderNumber}`,
        message: `Track order ${order.orderNumber}\n${shareUrl}`,
        url: shareUrl,
      });
      await triggerHaptic("success");
    } catch (error) {
      showError(getFriendlyErrorMessage(error, "Could not share this order."));
    }
  }, [order.orderNumber, shareUrl, showError]);

  const handleCopyLink = useCallback(async () => {
    try {
      const { copyToClipboard } = await import("@/lib/clipboard");
      const copied = await copyToClipboard(shareUrl);
      if (copied) {
        await triggerHaptic("success");
        showToast("Tracking link copied", { type: "success" });
        return;
      }
      showError("Could not copy the link.");
    } catch (error) {
      showError(getFriendlyErrorMessage(error, "Could not copy the link."));
    }
  }, [shareUrl, showError, showToast]);

  return (
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
            <CopyOrderNumber orderNumber={order.orderNumber} />
            <Text style={styles.placedAt}>
              Placed on {formatOrderDateTime(order.createdAt)}
            </Text>
          </View>
          <OrderStatusBadge status={order.status as OrderStatus} />
        </View>
        <View style={styles.shareRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share tracking link"
            onPress={() => void handleShare()}
            style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
          >
            <Ionicons name="share-outline" size={18} color={colors.primary} />
            <Text style={styles.shareLabel}>Share</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy tracking link"
            onPress={() => void handleCopyLink()}
            style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
          >
            <Ionicons name="link-outline" size={18} color={colors.primary} />
            <Text style={styles.shareLabel}>Copy link</Text>
          </Pressable>
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
        <Text style={styles.infoValue}>{order.customerName}</Text>
        <Text style={styles.contact}>{order.customerEmail}</Text>
        <Text style={styles.contact}>{order.customerPhone}</Text>
      </View>

      <OrderItemsSection items={items} currency={order.currency} />

      <OrderPromotionsSummary
        promotions={(order.promotions ?? []).map((promo) => ({
          promotionName: promo.promotionName,
          promotionDescription: promo.promotionDescription,
          freeQuantity: promo.freeQuantity,
          savingsAmount: promo.savingsAmount,
        }))}
        currency={order.currency}
      />

      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <PaymentStatusBadge status={order.paymentStatus as PaymentStatus} />
          <PaymentMethodBadge method={order.paymentMethod as PaymentMethod} />
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
        <View style={styles.infoHeader}>
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={styles.infoLabel}>Delivery to</Text>
        </View>
        <Text style={styles.address}>{order.customerAddress}</Text>
        {order.statusHistory?.length ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.cardTitle}>Status history</Text>
            {order.statusHistory.map((entry) => (
              <View key={`${entry.createdAt}-${entry.event}`} style={styles.historyRow}>
                <Text style={styles.historyEvent}>{entry.description}</Text>
                <Text style={styles.historyDate}>
                  {formatOrderDateTime(entry.createdAt)}
                </Text>
              </View>
            ))}
          </>
        ) : null}
      </View>

      <Text style={styles.hint}>Updates automatically when the order status changes.</Text>
    </ScrollView>
  );
}

export default function QrResolveScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { isOffline } = useNetworkStatus();
  const { showError, showSuccess } = useToast();
  const params = useLocalSearchParams<{ type?: string; token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const type = typeof params.type === "string" ? params.type : "";
  const resolveQr = useAction(api.qr.resolve);
  const startPayment = useAction(api.stripe.startPaymentFromQr);
  const { presentPayment } = usePaymentSheetCheckout();

  const [result, setResult] = useState<ResolveResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setResult({
        ok: false,
        code: "invalid",
        message: "This QR code is not valid.",
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await ensureOnlineNow("Internet connection required to validate this QR code.");
      const payload = (await resolveQr({
        tokenOrUrl: type ? `/qr/${type}/${token}` : token,
        source: "mobile",
        platform: Platform.OS,
      })) as ResolveResult;
      setResult(payload);
      if (payload.ok && payload.type === "product" && payload.productId) {
        router.replace({
          pathname: "/product/[id]",
          params: { id: payload.productId },
        });
      }
    } catch (error) {
      setResult({
        ok: false,
        code: "invalid",
        message: getFriendlyErrorMessage(error, "This QR code is not valid."),
      });
    } finally {
      setLoading(false);
    }
  }, [resolveQr, token, type]);

  useEffect(() => {
    void load();
  }, [load]);

  const pay = useCallback(async () => {
    setPaying(true);
    try {
      await ensureOnlineNow("Internet connection required to pay.");
      const payment = await startPayment({
        tokenOrUrl: `/qr/payment/${token}`,
        platform: "mobile",
      });
      if (payment.alreadyPaid) {
        showSuccess("This order has already been paid.");
        router.replace({
          pathname: "/order/[id]",
          params: {
            id: payment.orderNumber,
            orderNumber: payment.orderNumber,
            source: "track",
          },
        });
        return;
      }
      if (!payment.clientSecret) {
        throw new Error("Payment could not be started.");
      }
      const sheet = await presentPayment(payment.clientSecret, {
        fullName: payment.customerName ?? "Customer",
        email: payment.customerEmail ?? "",
        phone: payment.customerPhone ?? "",
        address: payment.customerAddress ?? "",
      });
      if (sheet.type === "canceled") {
        await triggerHaptic("warning");
        return;
      }
      if (sheet.type !== "completed") {
        throw new Error(
          sheet.type === "failed" || sheet.type === "init_failed"
            ? sheet.message
            : "Payment failed."
        );
      }
      await triggerHaptic("success");
      showSuccess("Payment submitted. We’ll confirm it shortly.");
      router.replace({
        pathname: "/order/[id]",
        params: {
          id: payment.orderNumber,
          orderNumber: payment.orderNumber,
          source: "track",
        },
      });
    } catch (error) {
      await triggerHaptic("error");
      showError(getFriendlyErrorMessage(error, "Payment could not be completed."));
    } finally {
      setPaying(false);
    }
  }, [presentPayment, showError, showSuccess, startPayment, token]);

  return (
    <ScreenContainer>
      <View style={styles.flex}>
        <Header
          title={
            result?.type === "payment"
              ? "Secure payment"
              : result?.type === "order"
                ? "Order Tracking"
                : "QR code"
          }
          showBack
          showSearch={false}
          showCart={false}
        />
        {isOffline ? (
          <View style={styles.padded}>
            <OfflineNotice
              message="Internet connection required to validate this QR code."
              onRetry={() => void load()}
            />
          </View>
        ) : loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loading}>Checking QR code…</Text>
          </View>
        ) : !result?.ok ? (
          <EmptyState
            icon="alert-circle-outline"
            title="QR unavailable"
            description={result?.message ?? "This QR code is not valid."}
            actionLabel="Scan another"
            onAction={() => router.replace("/scan" as Href)}
          />
        ) : result.type === "payment" ? (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + spacing["2xl"] },
            ]}
          >
            <Text style={styles.metaLabel}>Secure payment</Text>
            <Text style={styles.orderNumber}>Pay order {result.orderNumber}</Text>
            {result.amount != null && result.currency ? (
              <Text style={styles.payAmount}>
                {formatCurrencyAmount(result.amount, result.currency)}
              </Text>
            ) : null}
            <Text style={styles.contact}>
              The QR code only opens this payment page. Payment is confirmed by Stripe after
              checkout.
            </Text>
            <Button label="Pay now" loading={paying} onPress={() => void pay()} />
          </ScrollView>
        ) : result.type === "package" || result.type === "delivery" ? (
          <EmptyState
            icon="lock-closed-outline"
            title="Staff access required"
            description="Package and delivery codes must be scanned by an admin in the web scanner."
            actionLabel="Track an order"
            onAction={() => router.replace("/track")}
          />
        ) : result.type === "order" && result.order ? (
          <OrderTrackingLive token={token} initial={result.order} />
        ) : (
          <EmptyState
            icon="checkmark-circle-outline"
            title="QR resolved"
            description={result.message}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

function createStyles({ colors, textStyles }: ThemeStyleTokens) {
  return {
    flex: { flex: 1, backgroundColor: colors.background },
    padded: { padding: spacing.xl },
    centered: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: spacing.md,
    },
    loading: { color: colors.textSecondary, fontSize: typography.sm },
    content: {
      paddingTop: spacing.lg,
      gap: spacing.lg,
    },
    headerCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md,
    },
    headerTop: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "flex-start" as const,
      gap: spacing.md,
    },
    headerText: { flex: 1, gap: spacing.xs },
    metaLabel: {
      fontSize: typography.xs,
      fontWeight: "700" as const,
      letterSpacing: 0.6,
      textTransform: "uppercase" as const,
      color: colors.textSecondary,
    },
    orderNumber: { ...textStyles.sectionTitle, color: colors.foreground },
    placedAt: { fontSize: typography.sm, color: colors.textSecondary },
    shareRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing.sm },
    shareButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    shareLabel: {
      fontSize: typography.sm,
      fontWeight: "600" as const,
      color: colors.primary,
    },
    pressed: { opacity: 0.75 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: { ...textStyles.sectionTitle, fontSize: typography.base },
    badgeRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing.sm },
    infoValue: { fontSize: typography.base, fontWeight: "600" as const, color: colors.foreground },
    contact: { fontSize: typography.sm, color: colors.textSecondary, lineHeight: 20 },
    infoLabel: { fontSize: typography.sm, fontWeight: "600" as const, color: colors.textSecondary },
    infoHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
    },
    address: { fontSize: typography.sm, color: colors.foreground, lineHeight: 20 },
    divider: { height: 1, backgroundColor: colors.border },
    historyRow: { gap: 2, marginTop: spacing.sm },
    historyEvent: { fontSize: typography.sm, color: colors.foreground },
    historyDate: { fontSize: typography.xs, color: colors.textSecondary },
    hint: {
      color: colors.textSecondary,
      fontSize: typography.xs,
      textAlign: "center" as const,
    },
    payAmount: { ...textStyles.sectionTitle, color: colors.primary },
  };
}

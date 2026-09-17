import { useAction, useQuery } from "convex/react";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/feedback/EmptyState";
import { OfflineNotice } from "@/components/feedback/OfflineNotice";
import { Header } from "@/components/layout/Header";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { OrderProgressTimeline } from "@/components/orders/OrderProgressTimeline";
import {
  OrderStatusBadge,
  PaymentMethodBadge,
  PaymentStatusBadge,
} from "@/components/orders/OrderStatusBadges";
import { Button } from "@/components/ui/Button";
import { spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { usePaymentSheetCheckout } from "@/hooks/usePaymentSheetCheckout";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { useTheme } from "@/providers/theme-context";
import { useToast } from "@/providers/toast-context";
import { api } from "@/lib/convex-api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { triggerHaptic } from "@/lib/haptics";
import { ensureOnlineNow } from "@/lib/network";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/order-display";
import { formatCurrencyAmount } from "@ecommerce/shared";

type ResolveResult = {
  ok: boolean;
  code: string;
  message: string;
  type?: string;
  productId?: string;
  productName?: string;
  orderNumber?: string;
  amount?: number;
  currency?: string;
  order?: {
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    total: number;
    currency: string;
    items: Array<{ productName: string; quantity: number; color: string }>;
  };
};

type LiveOrder = NonNullable<ResolveResult["order"]>;

function OrderTrackingLive({ token, initial }: { token: string; initial: LiveOrder }) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const live = useQuery(api.qr.watchOrderFromQr, { token });
  const order: LiveOrder =
    live?.ok && live.order ? (live.order as LiveOrder) : initial;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing["2xl"] }]}
    >
      <Text style={styles.kicker}>Order Tracking</Text>
      <Text style={styles.title}>{order.orderNumber}</Text>
      <View style={styles.badgeRow}>
        <OrderStatusBadge status={order.status as OrderStatus} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Progress</Text>
        <OrderProgressTimeline status={order.status as OrderStatus} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment</Text>
        <View style={styles.badgeRow}>
          <PaymentStatusBadge status={order.paymentStatus as PaymentStatus} />
          <PaymentMethodBadge method={order.paymentMethod as PaymentMethod} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {itemCount} {itemCount === 1 ? "Item" : "Items"}
        </Text>
        {order.items.map((item) => (
          <View key={`${item.productName}-${item.color}`} style={styles.itemRow}>
            <Text style={styles.itemName}>
              {item.productName}
              {item.color ? ` · ${item.color}` : ""}
            </Text>
            <Text style={styles.body}>Qty {item.quantity}</Text>
          </View>
        ))}
        <Text style={styles.amount}>
          Total: {formatCurrencyAmount(order.total, order.currency)}
        </Text>
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
            <Text style={styles.kicker}>Secure payment</Text>
            <Text style={styles.title}>Pay order {result.orderNumber}</Text>
            {result.amount != null && result.currency ? (
              <Text style={styles.amount}>
                {formatCurrencyAmount(result.amount, result.currency)}
              </Text>
            ) : null}
            <Text style={styles.body}>
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
      padding: spacing.xl,
      gap: spacing.md,
    },
    kicker: { ...textStyles.metaLabel },
    title: { ...textStyles.screenTitle },
    amount: { ...textStyles.sectionTitle, color: colors.primary, marginTop: spacing.sm },
    body: { color: colors.textSecondary, fontSize: typography.sm, lineHeight: 22 },
    badgeRow: { flexDirection: "row" as const, gap: spacing.sm },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: spacing.lg,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: { ...textStyles.sectionTitle, fontSize: typography.base },
    itemRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      gap: spacing.md,
      paddingVertical: spacing.xs,
    },
    itemName: { flex: 1, color: colors.text, fontSize: typography.sm },
    hint: { color: colors.textSecondary, fontSize: typography.xs, marginTop: spacing.sm },
  };
}

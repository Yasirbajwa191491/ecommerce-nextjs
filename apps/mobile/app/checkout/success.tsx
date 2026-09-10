import { Ionicons } from "@expo/vector-icons";
import { useAction, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Header } from "@/components/layout/Header";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { OrderDeliverySummary } from "@/components/checkout/OrderDeliverySummary";
import { PriceBreakdown } from "@/components/checkout/PriceBreakdown";
import { OrderItemsSection } from "@/components/orders/OrderItemsSection";
import { OrderProgressTimeline } from "@/components/orders/OrderProgressTimeline";
import { OrderPromotionsSummary } from "@/components/orders/OrderPromotionsSummary";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadges";
import { OrderSummaryCards } from "@/components/orders/OrderSummaryCards";
import { CopyOrderNumber } from "@/components/orders/CopyOrderNumber";
import { Button } from "@/components/ui/Button";
import { radius, spacing, typography } from "@/constants/theme";
import { usePaymentSheetCheckout } from "@/hooks/usePaymentSheetCheckout";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";
import {
  clearLastOrderInfo,
  clearPendingStripeOrder,
  loadLastOrderInfo,
} from "@/lib/checkout-customer-storage";
import { api } from "@/lib/convex-api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import {
  getCheckoutSuccessMessage,
  getCheckoutSuccessTitle,
  getPaymentMethodLabel,
  type OrderStatus,
} from "@/lib/order-display";
import { getStripePublishableKey } from "@/lib/stripe-config";
import { useCart } from "@/providers/cart-context";
import { usePushNotificationContextOptional } from "@/providers/PushNotificationProvider";
import { useToast } from "@/providers/toast-context";

export default function CheckoutSuccessScreen() {
  const { colors, textStyles } = useTheme();
  const styles = useThemedStyles(createSuccessStyles);
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useLayoutMetrics();
  const rootStyle = useScreenRootStyle();
  const { clearCart } = useCart();
  const { showError } = useToast();
  const clearedRef = useRef(false);
  const pushPromptRef = useRef(false);
  const pushNotifications = usePushNotificationContextOptional();
  const resumeMobilePaymentIntent = useAction(api.stripe.resumeMobilePaymentIntent);
  const { presentPayment } = usePaymentSheetCheckout();
  const [resuming, setResuming] = useState(false);

  const params = useLocalSearchParams<{
    orderNumber?: string;
    pendingPayment?: string;
    accessToken?: string;
  }>();

  const [storedOrder, setStoredOrder] = useState<{
    orderNumber: string | null;
    email: string | null;
    accessToken: string | null;
  }>({ orderNumber: null, email: null, accessToken: null });
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    void loadLastOrderInfo().then((info) => {
      setStoredOrder(info);
      setStorageReady(true);
    });
  }, []);

  const orderNumber =
    (typeof params.orderNumber === "string" && params.orderNumber
      ? params.orderNumber
      : null) ?? storedOrder.orderNumber;

  const accessToken =
    (typeof params.accessToken === "string" && params.accessToken
      ? params.accessToken
      : null) ?? storedOrder.accessToken ?? undefined;

  const customerEmail = storedOrder.email ?? undefined;
  const lookupReady = storageReady && Boolean(customerEmail || accessToken);

  const orderData = useQuery(
    api.orders.getOrderByNumber,
    lookupReady && orderNumber && (customerEmail || accessToken)
      ? { orderNumber, customerEmail, accessToken }
      : "skip"
  );

  const isLoading = Boolean(lookupReady && orderNumber && orderData === undefined);
  const order = orderData?.order;
  const items = orderData?.items ?? [];
  const promotions = orderData?.promotions ?? [];

  const isPendingStripe =
    order?.paymentMethod === "stripe" && order.paymentStatus === "pending";
  const isFailedStripe =
    order?.paymentMethod === "stripe" && order.paymentStatus === "failed";

  useEffect(() => {
    if (!order || clearedRef.current) return;
    if (order.paymentMethod === "stripe" && order.paymentStatus === "pending") return;
    if (order.paymentMethod === "stripe" && order.paymentStatus === "failed") return;
    clearedRef.current = true;
    clearCart();
    void clearLastOrderInfo();
    void clearPendingStripeOrder();
  }, [clearCart, order]);

  useEffect(() => {
    if (!order || pushPromptRef.current || !pushNotifications) {
      return;
    }

    const email = order.customerEmail || customerEmail;
    if (!email) {
      return;
    }

    pushPromptRef.current = true;
    void pushNotifications.enablePushNotifications(email);
  }, [customerEmail, order, pushNotifications]);

  const paymentLabel = getPaymentMethodLabel(order?.paymentMethod);
  const statusTitle = order ? getCheckoutSuccessTitle(order) : "Order confirmed!";
  const statusMessage = order ? getCheckoutSuccessMessage(order) : "";

  const handleRetryPayment = useCallback(async () => {
    if (!orderNumber || resuming) return;

    if (!getStripePublishableKey()) {
      showError("Card payments are not configured on this device.");
      return;
    }

    setResuming(true);
    try {
      const resumed = await resumeMobilePaymentIntent({
        orderNumber,
        customerEmail,
        accessToken,
      });

      if (resumed.alreadyPaid) {
        return;
      }

      const customerDetails = {
        fullName: order?.customerName ?? "",
        email: order?.customerEmail ?? customerEmail ?? "",
        phone: order?.customerPhone ?? "",
        address: order?.customerAddress ?? "",
      };

      const paymentResult = await presentPayment(resumed.clientSecret, customerDetails);

      if (paymentResult.type === "canceled") {
        return;
      }

      if (paymentResult.type === "init_failed" || paymentResult.type === "failed") {
        showError(paymentResult.message);
        return;
      }

      router.replace({
        pathname: "/checkout/success",
        params: {
          orderNumber: resumed.orderNumber,
          accessToken: resumed.accessToken ?? accessToken ?? "",
          pendingPayment: "1",
        },
      });
    } catch (error) {
      showError(getFriendlyErrorMessage(error, "Unable to reopen payment. Please try again."));
    } finally {
      setResuming(false);
    }
  }, [
    accessToken,
    customerEmail,
    order,
    orderNumber,
    presentPayment,
    resumeMobilePaymentIntent,
    resuming,
    showError,
  ]);

  return (
    <ScreenContainer>
      <View style={[styles.container, rootStyle]}>
        <Header title="Order confirmation" showBack={false} showSearch={false} showCart={false} />

        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: insets.bottom + spacing["3xl"],
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading your order…</Text>
            </View>
          ) : !orderNumber || !order ? (
            <View style={styles.loadingWrap}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
              <Text style={textStyles.sectionTitle}>Order not found</Text>
              <Text style={styles.loadingText}>
                We couldn't retrieve your order details. Check your email for confirmation.
              </Text>
              <Button label="Continue shopping" onPress={() => router.replace("/(tabs)/shop")} />
            </View>
          ) : (
            <>
              <View style={styles.iconWrap}>
                <Ionicons
                  name={
                    isFailedStripe
                      ? "close-circle"
                      : isPendingStripe
                        ? "time-outline"
                        : "checkmark-circle"
                  }
                  size={56}
                  color={isFailedStripe ? colors.destructive : colors.success}
                />
              </View>

              <Text style={styles.title}>{statusTitle}</Text>
              <Text style={styles.subtitle}>{statusMessage}</Text>

              {isPendingStripe ? (
                <Text style={styles.processingNote}>
                  Your order status updates automatically once payment is confirmed.
                </Text>
              ) : null}

              <View style={styles.card}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Order number</Text>
                  <Text style={styles.infoValue}>{order.orderNumber}</Text>
                  <CopyOrderNumber orderNumber={order.orderNumber} />
                </View>
                <View style={styles.divider} />
                <View style={styles.statusHeader}>
                  <Text style={styles.cardSectionTitle}>Order progress</Text>
                  <OrderStatusBadge status={order.status as OrderStatus} />
                </View>
                <OrderProgressTimeline status={order.status as OrderStatus} />
                <OrderSummaryCards
                  paymentMethod={order.paymentMethod}
                  paymentStatus={order.paymentStatus}
                  total={order.total}
                  currency={order.currency}
                  createdAt={order.createdAt}
                  paidAt={order.paidAt}
                />
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Payment</Text>
                  <Text style={styles.infoValue}>{paymentLabel}</Text>
                </View>
              </View>

              <View style={styles.fullWidthCard}>
                <OrderItemsSection items={items} currency={order.currency} />
              </View>

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
                  <Text style={styles.infoLabel}>Delivery to</Text>
                  <Text style={styles.infoValueMultiline}>{order.customerAddress}</Text>
                  <Text style={styles.infoSubValue}>
                    {order.customerName} · {order.customerPhone}
                  </Text>
                </View>
                {order.customerNotes ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoLabel}>Order notes</Text>
                      <Text style={styles.infoValueMultiline}>{order.customerNotes}</Text>
                    </View>
                  </>
                ) : null}
              </View>

              <Text style={styles.confirmationNote}>
                A confirmation email will be sent to {order.customerEmail}.
              </Text>

              <View style={styles.actions}>
                {isPendingStripe || isFailedStripe ? (
                  <Button
                    label={resuming ? "Opening payment…" : "Retry payment"}
                    fullWidth
                    loading={resuming}
                    disabled={resuming}
                    onPress={() => void handleRetryPayment()}
                  />
                ) : null}
                <Button
                  label="View order"
                  fullWidth
                  variant={isPendingStripe || isFailedStripe ? "outline" : "primary"}
                  onPress={() =>
                    router.push({
                      pathname: "/order/[id]",
                      params: {
                        id: order._id,
                        orderNumber: order.orderNumber,
                        accessToken: accessToken ?? order.accessToken ?? "",
                      },
                    })
                  }
                />
                {isPendingStripe || isFailedStripe ? (
                  <Button
                    label="Return to cart"
                    variant="outline"
                    fullWidth
                    onPress={() => router.replace("/(tabs)/cart")}
                  />
                ) : null}
                <Button
                  label="Continue shopping"
                  variant="outline"
                  fullWidth
                  onPress={() => router.replace("/(tabs)/shop")}
                />
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

function createSuccessStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingTop: spacing["2xl"],
      alignItems: "center",
      gap: spacing.lg,
    },
    loadingWrap: {
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing["3xl"],
    },
    loadingText: {
      fontSize: typography.sm,
      color: colors.textSecondary,
      textAlign: "center",
      maxWidth: 280,
    },
    iconWrap: {
      width: 96,
      height: 96,
      borderRadius: radius.full,
      backgroundColor: colors.successMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      ...textStyles.screenTitle,
      color: colors.foreground,
      textAlign: "center",
    },
    subtitle: {
      ...textStyles.bodySmall,
      color: colors.textSecondary,
      textAlign: "center",
      maxWidth: 320,
    },
    processingNote: {
      fontSize: typography.sm,
      color: colors.textSecondary,
      textAlign: "center",
      maxWidth: 320,
    },
    card: {
      width: "100%",
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    fullWidthCard: {
      width: "100%",
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.md,
    },
    infoBlock: {
      gap: spacing.xs,
    },
    infoLabel: {
      fontSize: typography.sm,
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: typography.sm,
      fontWeight: "600",
      color: colors.foreground,
      textAlign: "right",
      flexShrink: 1,
    },
    infoValueMultiline: {
      fontSize: typography.sm,
      fontWeight: "500",
      color: colors.foreground,
      lineHeight: 20,
    },
    infoSubValue: {
      fontSize: typography.sm,
      color: colors.textSecondary,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderLight,
    },
    statusHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.md,
    },
    cardSectionTitle: {
      ...textStyles.sectionTitle,
      color: colors.foreground,
      fontSize: typography.base,
    },
    actions: {
      width: "100%",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    confirmationNote: {
      fontSize: typography.sm,
      color: colors.textSecondary,
      textAlign: "center",
      maxWidth: 320,
    },
  });
}

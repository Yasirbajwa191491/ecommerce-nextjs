import { formatCurrencyAmount } from "@ecommerce/shared";
import { useAction, useMutation } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeliveryMethodSelector } from "@/components/checkout/DeliveryMethodSelector";
import { OrderSummarySection } from "@/components/checkout/OrderSummarySection";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { PriceBreakdown } from "@/components/checkout/PriceBreakdown";
import { PromotionAppliedSection } from "@/components/checkout/PromotionAppliedSection";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { CheckoutOfflineNotice } from "@/components/feedback/OfflineNotice";
import { Header } from "@/components/layout/Header";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";
import { useCartPricing } from "@/hooks/useCartPricing";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  createIdempotencyKey,
  loadCheckoutCustomer,
  saveCheckoutCustomer,
  saveLastOrderInfo,
  savePendingStripeOrder,
} from "@/lib/checkout-customer-storage";
import {
  getMobileStripeCheckoutUrls,
  parseCheckoutReturnUrl,
} from "@/lib/checkout-stripe";
import { api } from "@/lib/convex-api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import {
  ensureOnlineNow,
  isLikelyOfflineError,
  refreshNetworkSnapshot,
  OFFLINE_MESSAGE,
  OFFLINE_TITLE,
} from "@/lib/network";
import {
  validateCheckoutForm,
  type CheckoutFormValues,
  type PaymentMethod,
} from "@/lib/validation/checkout-form";
import { getVisitorId } from "@/lib/visitor-id";
import { useCart } from "@/providers/cart-context";
import { useToast } from "@/providers/toast-context";

type DeliveryMethodType = "standard" | "express" | "same_day" | "next_day" | "pickup";

const emptyForm = (): CheckoutFormValues => ({
  fullName: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  paymentMethod: "",
  termsAccepted: false,
  privacyAccepted: false,
});

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useLayoutMetrics();
  const rootStyle = useScreenRootStyle();
  const { cart, itemCount, hydrated, clearCart } = useCart();
  const { showError, showSuccess } = useToast();
  const { isOnline, isOffline, isConnected } = useNetworkStatus();

  const [form, setForm] = useState<CheckoutFormValues>(emptyForm);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethodType | undefined>();
  const [touched, setTouched] = useState<Partial<Record<keyof CheckoutFormValues, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [customerLoaded, setCustomerLoaded] = useState(false);

  const idempotencyKeyRef = useRef(createIdempotencyKey());
  const submittingRef = useRef(false);
  const createCashOrder = useMutation(api.orders.createCashOrder);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const saveCustomerProfile = useMutation(api.orders.saveCustomerProfile);

  const {
    priced,
    pricingError,
    mixedCurrency,
    isLoading: pricingLoading,
    getPricedItem,
    lines,
  } = useCartPricing(cart, deliveryMethod);
  const selectedDeliveryMethod =
    deliveryMethod ?? priced?.deliveryMethod ?? "standard";
  const availableDeliveryMethods = priced?.availableDeliveryMethods ?? [];
  const giftItems = priced?.items?.filter((item) => item.isPromotionGift) ?? [];

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = await loadCheckoutCustomer();
      if (!cancelled && saved) {
        setForm((current) => ({
          ...current,
          fullName: saved.fullName,
          email: saved.email,
          phone: saved.phone,
          address: saved.address,
          notes: saved.notes ?? "",
        }));
      }
      if (!cancelled) setCustomerLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const errors = useMemo(() => validateCheckoutForm(form), [form]);
  const visibleErrors = useMemo(() => {
    const result: Partial<Record<keyof CheckoutFormValues, string>> = {};
    for (const key of Object.keys(errors) as (keyof CheckoutFormValues)[]) {
      if (touched[key]) result[key] = errors[key];
    }
    return result;
  }, [errors, touched]);

  const cartLines = lines ?? [];

  const isFormValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const updateField = useCallback(
    <K extends keyof CheckoutFormValues>(key: K, value: CheckoutFormValues[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
    },
    []
  );

  const touchField = useCallback((key: keyof CheckoutFormValues) => {
    setTouched((current) => ({ ...current, [key]: true }));
  }, []);

  const touchAll = useCallback(() => {
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      address: true,
      notes: true,
      paymentMethod: true,
      termsAccepted: true,
      privacyAccepted: true,
    });
  }, []);

  const persistCustomer = useCallback(async () => {
    const customerRecord = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim() || undefined,
    };

    await saveCheckoutCustomer(customerRecord);

    try {
      await saveCustomerProfile({
        email: customerRecord.email,
        fullName: customerRecord.fullName,
        phone: customerRecord.phone,
        address: customerRecord.address,
        visitorId: await getVisitorId(),
      });
    } catch {
      // Non-blocking
    }
  }, [form, saveCustomerProfile]);

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    touchAll();
    if (!isFormValid) {
      showError("Please complete all required fields.");
      return;
    }

    try {
      await ensureOnlineNow(`${OFFLINE_TITLE}. ${OFFLINE_MESSAGE}`);
    } catch (error) {
      showError(getFriendlyErrorMessage(error, `${OFFLINE_TITLE}. ${OFFLINE_MESSAGE}`));
      return;
    }

    if (!cartLines.length) {
      showError("Your cart is empty.");
      router.replace("/(tabs)/cart");
      return;
    }

    if (cartLines.some((line) => !line.productId?.trim())) {
      showError("Some cart items are outdated. Please remove them and add products again.");
      router.replace("/(tabs)/cart");
      return;
    }

    if (pricingLoading || !priced || lines === undefined) {
      showError("Please wait while we confirm your latest prices.");
      return;
    }

    if (pricingError) {
      showError(getFriendlyErrorMessage(pricingError));
      router.replace("/(tabs)/cart");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    const customerPayload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim() || undefined,
      termsAccepted: form.termsAccepted,
      privacyAccepted: form.privacyAccepted,
    };

    const payload = {
      lines: cartLines,
      customer: customerPayload,
      idempotencyKey: idempotencyKeyRef.current,
      deliveryMethod: selectedDeliveryMethod,
    };

    try {
      await ensureOnlineNow(`${OFFLINE_TITLE}. ${OFFLINE_MESSAGE}`);

      if (form.paymentMethod === "cod") {
        const result = await createCashOrder(payload);
        await persistCustomer();
        await saveLastOrderInfo(result.orderNumber, customerPayload.email, result.accessToken);
        clearCart();
        showSuccess("Order placed successfully!");
        router.replace({
          pathname: "/checkout/success",
          params: {
            orderNumber: result.orderNumber,
            accessToken: result.accessToken ?? "",
          },
        });
        return;
      }

      const stripeUrls = getMobileStripeCheckoutUrls();
      const result = await createCheckoutSession({
        ...payload,
        successUrl: stripeUrls.successUrl,
        cancelUrl: stripeUrls.cancelUrl,
      });

      await persistCustomer();
      await saveLastOrderInfo(result.orderNumber, customerPayload.email, result.accessToken);
      await savePendingStripeOrder({
        orderNumber: result.orderNumber,
        email: customerPayload.email,
        accessToken: result.accessToken,
      });

      WebBrowser.maybeCompleteAuthSession();

      const browserResult = await WebBrowser.openAuthSessionAsync(
        result.url,
        stripeUrls.returnUrl
      );

      if (browserResult.type === "success" && browserResult.url) {
        const parsed = parseCheckoutReturnUrl(browserResult.url);
        if (parsed.type === "success") {
          router.replace({
            pathname: "/checkout/success",
            params: {
              orderNumber: parsed.orderNumber ?? result.orderNumber,
              accessToken: parsed.accessToken ?? result.accessToken ?? "",
              session_id: parsed.sessionId ?? "",
            },
          });
          return;
        }
      }

      router.replace({
        pathname: "/checkout/cancel",
        params: {
          orderNumber: result.orderNumber,
          accessToken: result.accessToken ?? "",
        },
      });
    } catch (error) {
      const message = getFriendlyErrorMessage(
        error,
        "Checkout failed. Please review your details and try again."
      );
      showError(
        isLikelyOfflineError(error)
          ? `${OFFLINE_TITLE}. ${OFFLINE_MESSAGE}`
          : message
      );
      const alreadySubmitted = message.toLowerCase().includes("already submitted");
      if (!isLikelyOfflineError(error) && !alreadySubmitted) {
        idempotencyKeyRef.current = createIdempotencyKey();
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [
    cartLines,
    lines,
    clearCart,
    createCashOrder,
    createCheckoutSession,
    form,
    isFormValid,
    persistCustomer,
    selectedDeliveryMethod,
    pricingError,
    pricingLoading,
    priced,
    showError,
    showSuccess,
    touchAll,
  ]);

  const ctaLabel = useMemo(() => {
    if (submitting) {
      return form.paymentMethod === "stripe" ? "Preparing payment…" : "Placing order…";
    }
    return form.paymentMethod === "stripe" ? "Continue to payment" : "Place order";
  }, [form.paymentMethod, submitting]);

  if (!hydrated || !customerLoaded || isConnected === null) {
    return (
      <ScreenContainer>
        <View style={[styles.container, rootStyle]}>
          <Header title="Checkout" showBack showSearch={false} showCart={false} />
          <View style={[styles.loadingWrap, { paddingHorizontal: horizontalPadding }]}>
            <Skeleton height={120} />
            <Skeleton height={220} />
            <Skeleton height={180} />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (itemCount === 0) {
    return (
      <ScreenContainer>
        <View style={[styles.container, rootStyle]}>
          <Header title="Checkout" showBack showSearch={false} showCart={false} />
          <EmptyState
            icon="cart-outline"
            title="Your cart is empty"
            description="Add items to your cart before checking out."
            actionLabel="Continue shopping"
            onAction={() => router.replace("/(tabs)/shop")}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (isOffline || !isOnline) {
    return (
      <ScreenContainer>
        <View style={[styles.container, rootStyle]}>
          <Header title="Checkout" showBack showSearch={false} showCart={false} />
          <View style={[styles.loadingWrap, { paddingHorizontal: horizontalPadding }]}>
            <CheckoutOfflineNotice onRetry={() => void refreshNetworkSnapshot()} />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (pricingError && !pricingLoading) {
    return (
      <ScreenContainer>
        <View style={[styles.container, rootStyle]}>
          <Header title="Checkout" showBack showSearch={false} showCart={false} />
          <ErrorState
            title={mixedCurrency ? "Different currencies in cart" : "Cart needs attention"}
            message={getFriendlyErrorMessage(pricingError)}
            actionLabel="View cart"
            onRetry={() => router.replace("/(tabs)/cart")}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={[styles.container, rootStyle]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
      >
        <Header title="Checkout" showBack showSearch={false} showCart={false} />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: insets.bottom + 120,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <PromotionAppliedSection
            gifts={giftItems.map((item) => ({
              productName: item.productName ?? "Gift item",
              color: item.color,
              quantity: item.quantity ?? 1,
              imageUrl: item.imageUrl,
              promotionName: item.promotionName,
            }))}
            summaries={priced?.promotionSummaries}
            promotionSavingsTotal={priced?.promotionSavingsTotal}
            currency={priced?.currency}
          />

          <OrderSummarySection
            cart={cart}
            getPricedItem={getPricedItem}
            currency={priced?.currency}
          />

          <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Contact information</Text>
            <Input
              label="Full name *"
              value={form.fullName}
              onChangeText={(value) => updateField("fullName", value)}
              onBlur={() => touchField("fullName")}
              error={visibleErrors.fullName}
              autoComplete="name"
              textContentType="name"
            />
            <Input
              label="Email *"
              value={form.email}
              onChangeText={(value) => updateField("email", value)}
              onBlur={() => touchField("email")}
              error={visibleErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <Input
              label="Phone number *"
              value={form.phone}
              onChangeText={(value) => updateField("phone", value)}
              onBlur={() => touchField("phone")}
              error={visibleErrors.phone}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>2. Delivery address</Text>
            <Input
              label="Address *"
              value={form.address}
              onChangeText={(value) => updateField("address", value)}
              onBlur={() => touchField("address")}
              error={visibleErrors.address}
              placeholder="Street address, city, state, postal code"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={styles.textArea}
              autoComplete="street-address"
              textContentType="fullStreetAddress"
            />
            <Input
              label="Order notes"
              value={form.notes}
              onChangeText={(value) => updateField("notes", value)}
              onBlur={() => touchField("notes")}
              error={visibleErrors.notes}
              placeholder="Optional delivery instructions"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              style={styles.notesArea}
            />
          </View>

          {availableDeliveryMethods.length > 0 ? (
            <View style={styles.card}>
              <DeliveryMethodSelector
                methods={availableDeliveryMethods}
                value={selectedDeliveryMethod}
                onChange={(method) =>
                  setDeliveryMethod(method as DeliveryMethodType)
                }
                currency={priced?.currency}
                disabled={submitting || pricingLoading}
              />
            </View>
          ) : null}

          <View style={styles.card}>
            <PaymentMethodSelector
              value={form.paymentMethod}
              onChange={(method: PaymentMethod) => {
                updateField("paymentMethod", method);
                touchField("paymentMethod");
              }}
              error={visibleErrors.paymentMethod}
              disabled={submitting}
            />
          </View>

          <PriceBreakdown
            subtotal={priced?.subtotal ?? 0}
            discountTotal={priced?.discountTotal ?? 0}
            shipping={priced?.shipping ?? 0}
            deliveryCharge={priced?.deliveryCharge ?? 0}
            deliveryMethod={priced?.deliveryMethod}
            deliveryMethodLabel={priced?.deliveryMethodLabel}
            tax={priced?.tax ?? 0}
            total={priced?.total ?? 0}
            currency={priced?.currency}
            isLoading={pricingLoading}
          />

          <View style={styles.card}>
            <Checkbox
              checked={form.termsAccepted}
              onChange={(checked) => {
                updateField("termsAccepted", checked);
                touchField("termsAccepted");
              }}
              label="I agree to the Terms & Conditions, Shipping Policy, and Return Policy."
              error={visibleErrors.termsAccepted}
              disabled={submitting}
            />
            <Checkbox
              checked={form.privacyAccepted}
              onChange={(checked) => {
                updateField("privacyAccepted", checked);
                touchField("privacyAccepted");
              }}
              label="I agree to the Privacy Policy."
              error={visibleErrors.privacyAccepted}
              disabled={submitting}
            />
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingHorizontal: horizontalPadding, paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          <View style={styles.footerTotal}>
            <Text style={styles.footerTotalLabel}>Total</Text>
            <Text style={styles.footerTotalValue}>
              {pricingLoading ? "…" : formatCurrencyAmount(priced?.total ?? 0, priced?.currency)}
            </Text>
          </View>
          <Button
            label={ctaLabel}
            size="lg"
            fullWidth
            loading={submitting}
            disabled={submitting || pricingLoading || !isFormValid || !isOnline || !priced}
            onPress={() => void handleSubmit()}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingWrap: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardTitle: {
    ...textStyles.sectionTitle,
    fontSize: typography.base,
  },
  textArea: {
    minHeight: 88,
    paddingTop: spacing.md,
  },
  notesArea: {
    minHeight: 72,
    paddingTop: spacing.md,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  footerTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerTotalLabel: {
    fontSize: typography.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  footerTotalValue: {
    fontSize: typography.xl,
    fontWeight: "800",
    color: colors.foreground,
  },
});

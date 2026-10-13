import { formatCurrencyAmount, normalizePhoneToE164 } from "@ecommerce/shared";
import { useAction, useMutation } from "convex/react";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeliveryMethodSelector } from "@/components/checkout/DeliveryMethodSelector";
import { CheckoutCountryPicker } from "@/components/checkout/CheckoutCountryPicker";
import { CHECKOUT_POLICIES, CheckoutPolicySheet } from "@/components/checkout/CheckoutPolicySheet";
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
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDefaultPhoneCountry } from "@/hooks/useDefaultPhoneCountry";
import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useCartPricing } from "@/hooks/useCartPricing";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { usePaymentSheetCheckout } from "@/hooks/usePaymentSheetCheckout";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  createIdempotencyKey,
  loadCheckoutCustomer,
  loadPendingStripeOrder,
  saveCheckoutCustomer,
  saveLastOrderInfo,
  savePendingStripeOrder,
  savePushEnrollmentProof,
} from "@/lib/checkout-customer-storage";
import {
  buildCheckoutCartFingerprint,
  pendingStripeOrderMatchesCart,
} from "@/lib/checkout-cart-fingerprint";
import { api } from "@/lib/convex-api";
import { getStripePublishableKey } from "@/lib/stripe-config";
import { getFriendlyErrorMessage, logAppError } from "@/lib/errors";
import { addMonitoringBreadcrumb } from "@/lib/monitoring/sentry";
import {
  ensureOnlineNow,
  isLikelyOfflineError,
  refreshNetworkSnapshot,
  OFFLINE_MESSAGE,
  OFFLINE_TITLE,
} from "@/lib/network";
import {
  CHECKOUT_FIELD_ORDER,
  formatCheckoutAddress,
  getFirstCheckoutError,
  validateCheckoutForm,
  type CheckoutFormValues,
  type PaymentMethod,
} from "@/lib/validation/checkout-form";
import { getVisitorId } from "@/lib/visitor-id";
import type { PolicySettingKey } from "@/lib/legal-content";
import { useCart } from "@/providers/cart-context";
import { useToast } from "@/providers/toast-context";

type DeliveryMethodType = "standard" | "express" | "same_day" | "next_day" | "pickup";

const emptyForm = (): CheckoutFormValues => ({
  fullName: "",
  email: "",
  phone: "",
  address: "",
  structuredAddress: true,
  city: "",
  region: "",
  postalCode: "",
  country: "",
  notes: "",
  paymentMethod: "",
  termsAccepted: false,
  privacyAccepted: false,
});

export default function CheckoutScreen() {
  const styles = useThemedStyles(createIndexStyles);
  const defaultPhoneCountry = useDefaultPhoneCountry();
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useLayoutMetrics();
  const rootStyle = useScreenRootStyle();
  const { cart, itemCount, hydrated, clearCart } = useCart();
  const { showError, showSuccess } = useToast();
  const { isOnline, isOffline, isConnected } = useNetworkStatus();

  useEffect(() => {
    addMonitoringBreadcrumb("Checkout opened", "checkout");
  }, []);

  const [form, setForm] = useState<CheckoutFormValues>(emptyForm);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethodType | undefined>();
  const [touched, setTouched] = useState<Partial<Record<keyof CheckoutFormValues, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [customerLoaded, setCustomerLoaded] = useState(false);
  const [policy, setPolicy] = useState<PolicySettingKey | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const fieldPositions = useRef<Partial<Record<keyof CheckoutFormValues, number>>>({});
  const inputRefs = useRef<Partial<Record<keyof CheckoutFormValues, TextInput | null>>>({});
  const phoneRef = useRef<TextInput>(null);
  const lastSubmissionRef = useRef<string | null>(null);
  const cardAvailable = Boolean(getStripePublishableKey());

  const idempotencyKeyRef = useRef(createIdempotencyKey());
  const submittingRef = useRef(false);
  const createCashOrder = useMutation(api.orders.createCashOrder);
  const createMobilePaymentIntent = useAction(api.stripe.createMobilePaymentIntent);
  const resumeMobilePaymentIntent = useAction(api.stripe.resumeMobilePaymentIntent);
  const saveCustomerProfile = useMutation(api.orders.saveCustomerProfile);
  const { presentPayment } = usePaymentSheetCheckout();

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
    if (customerLoaded) return;
    let cancelled = false;
    void (async () => {
      const saved = await loadCheckoutCustomer();
      if (!cancelled && saved) {
        setForm((current) => ({
          ...current,
          fullName: saved.fullName,
          email: saved.email,
          phone: normalizePhoneToE164(saved.phone, defaultPhoneCountry),
          address: saved.addressParts?.street ?? saved.address,
          structuredAddress: Boolean(saved.addressParts),
          city: saved.addressParts?.city ?? "",
          region: saved.addressParts?.region ?? "",
          postalCode: saved.addressParts?.postalCode ?? "",
          country: saved.addressParts?.country ?? "",
          notes: saved.notes ?? "",
        }));
      }
      if (!cancelled) setCustomerLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [defaultPhoneCountry, customerLoaded]);

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
    setTouched(Object.fromEntries(CHECKOUT_FIELD_ORDER.map((field) => [field, true])));
  }, []);

  const focusField = useCallback((field: keyof CheckoutFormValues) => {
    scrollRef.current?.scrollTo({ y: Math.max(0, (fieldPositions.current[field] ?? 0) - spacing.md), animated: true });
    const input = field === "phone" ? phoneRef.current : inputRefs.current[field];
    if (input) input.focus();
    else Keyboard.dismiss();
  }, []);

  const persistCustomer = useCallback(async () => {
    const customerRecord = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: normalizePhoneToE164(form.phone, defaultPhoneCountry),
      address: formatCheckoutAddress(form),
      addressParts: form.structuredAddress ? {
        street: form.address.trim(), city: form.city?.trim() ?? "", region: form.region?.trim() ?? "",
        postalCode: form.postalCode?.trim() ?? "", country: form.country?.trim() ?? "",
      } : undefined,
      notes: form.notes.trim() || undefined,
    };
    const stored = await loadCheckoutCustomer();
    const sameEmail =
      stored?.email.trim().toLowerCase() === customerRecord.email.trim().toLowerCase();

    await saveCheckoutCustomer({
      ...customerRecord,
      profileToken: sameEmail ? stored?.profileToken : undefined,
    });

    try {
      const saved = await saveCustomerProfile({
        email: customerRecord.email,
        fullName: customerRecord.fullName,
        phone: customerRecord.phone,
        address: customerRecord.address,
        visitorId: await getVisitorId(),
        profileToken: sameEmail ? stored?.profileToken : undefined,
      });
      await saveCheckoutCustomer({
        ...customerRecord,
        profileToken: saved.profileToken,
      });
    } catch {
      // Non-blocking
    }
  }, [defaultPhoneCountry, form, saveCustomerProfile]);

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    touchAll();
    if (!isFormValid) {
      const firstError = getFirstCheckoutError(errors);
      if (firstError) focusField(firstError);
      showError(firstError ? errors[firstError] ?? "Review the highlighted fields." : "Review the highlighted fields.");
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
    addMonitoringBreadcrumb("Checkout submitted", "checkout", {
      paymentMethod: form.paymentMethod,
    });

    const customerPayload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: normalizePhoneToE164(form.phone, defaultPhoneCountry),
      address: formatCheckoutAddress(form),
      notes: form.notes.trim() || undefined,
      termsAccepted: form.termsAccepted,
      privacyAccepted: form.privacyAccepted,
    };

    const cartFingerprint = buildCheckoutCartFingerprint({
      email: customerPayload.email, customer: customerPayload,
      deliveryMethod: selectedDeliveryMethod, lines: cartLines,
    });
    const submissionFingerprint = `${form.paymentMethod}:${cartFingerprint}`;
    if (lastSubmissionRef.current && lastSubmissionRef.current !== submissionFingerprint) {
      idempotencyKeyRef.current = createIdempotencyKey();
    }
    lastSubmissionRef.current = submissionFingerprint;

    const payload = {
      lines: cartLines,
      customer: customerPayload,
      idempotencyKey: idempotencyKeyRef.current,
      deliveryMethod: selectedDeliveryMethod,
    };

    try {
      await ensureOnlineNow(`${OFFLINE_TITLE}. ${OFFLINE_MESSAGE}`);

      if (form.paymentMethod === "cod") {
        addMonitoringBreadcrumb("Order creation started", "checkout", { method: "cod" });
        const result = await createCashOrder(payload);
        addMonitoringBreadcrumb("Order created", "checkout", {
          orderNumber: result.orderNumber,
        });
        await persistCustomer().catch((error: unknown) => logAppError(error, { segment: "checkout-customer-storage", expected: true }));
        await Promise.all([
          saveLastOrderInfo(result.orderNumber, customerPayload.email, result.accessToken),
          savePushEnrollmentProof(customerPayload.email, result.accessToken),
        ]).catch((error: unknown) => logAppError(error, { segment: "checkout-order-storage", expected: true }));
        clearCart();
        showSuccess("Order placed successfully!");
        router.replace({
          pathname: "/checkout/success",
          params: {
            orderNumber: result.orderNumber,
            customerEmail: customerPayload.email.trim().toLowerCase(),
            ...(result.accessToken ? { accessToken: result.accessToken } : {}),
          },
        });
        return;
      }

      if (!getStripePublishableKey()) {
        showError(
          "Card payments are not configured on this device. Please use cash on delivery or try again later."
        );
        return;
      }

      addMonitoringBreadcrumb("PaymentIntent creation started", "checkout");
      let result: Awaited<ReturnType<typeof createMobilePaymentIntent>> | null = null;
      const pendingSaved = await loadPendingStripeOrder();
      if (pendingStripeOrderMatchesCart(pendingSaved, cartFingerprint) && pendingSaved) {
        try {
          result = await resumeMobilePaymentIntent({
            orderNumber: pendingSaved.orderNumber,
            customerEmail: pendingSaved.email,
            accessToken: pendingSaved.accessToken,
          });
          addMonitoringBreadcrumb("Pending payment resumed", "checkout", {
            orderNumber: result.orderNumber,
            alreadyPaid: Boolean(result.alreadyPaid),
          });
        } catch (error) {
          addMonitoringBreadcrumb("Pending payment resume skipped", "checkout", {
            reason: getFriendlyErrorMessage(error, "resume_failed"),
          });
        }
      } else if (pendingSaved?.orderNumber) {
        addMonitoringBreadcrumb("Pending payment resume skipped", "checkout", {
          reason: "cart_mismatch",
        });
      }
      if (!result) {
        result = await createMobilePaymentIntent(payload);
      }
      addMonitoringBreadcrumb("PaymentIntent created", "checkout", {
        orderNumber: result.orderNumber,
        alreadyPaid: Boolean(result.alreadyPaid),
      });

      await persistCustomer().catch((error: unknown) => logAppError(error, { segment: "checkout-customer-storage", expected: true }));
      await Promise.all([
        saveLastOrderInfo(result.orderNumber, customerPayload.email, result.accessToken),
        savePushEnrollmentProof(customerPayload.email, result.accessToken),
        savePendingStripeOrder({
        orderNumber: result.orderNumber,
        email: customerPayload.email,
        accessToken: result.accessToken,
        cartFingerprint,
        }),
      ]).catch((error: unknown) => logAppError(error, { segment: "checkout-order-storage", expected: true }));
      if (result.alreadyPaid) {
        router.replace({
          pathname: "/checkout/success",
          params: {
            orderNumber: result.orderNumber,
            customerEmail: customerPayload.email.trim().toLowerCase(),
            ...(result.accessToken ? { accessToken: result.accessToken } : {}),
          },
        });
        return;
      }

      const paymentResult = await presentPayment(result.clientSecret, customerPayload);

      if (paymentResult.type === "canceled") {
        showError("Payment was cancelled. Your cart is unchanged — you can try again.");
        return;
      }

      if (paymentResult.type === "init_failed" || paymentResult.type === "failed") {
        showError(paymentResult.message);
        return;
      }

      addMonitoringBreadcrumb("Waiting for webhook confirmation", "checkout", {
        orderNumber: result.orderNumber,
      });

      router.replace({
        pathname: "/checkout/success",
        params: {
          orderNumber: result.orderNumber,
          customerEmail: customerPayload.email.trim().toLowerCase(),
          ...(result.accessToken ? { accessToken: result.accessToken } : {}),
          pendingPayment: "1",
        },
      });
    } catch (error) {
      logAppError(error, { segment: "checkout-submit" });
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
    createMobilePaymentIntent,
    resumeMobilePaymentIntent,
    form,
    presentPayment,
    isFormValid,
    persistCustomer,
    selectedDeliveryMethod,
    defaultPhoneCountry,
    pricingError,
    pricingLoading,
    priced,
    showError,
    showSuccess,
    touchAll,
    errors,
    focusField,
  ]);

  const ctaLabel = useMemo(() => {
    if (submitting) {
      return form.paymentMethod === "stripe" ? "Opening payment…" : "Placing order…";
    }
    if (pricingLoading || !priced) return "Checking total…";
    return form.paymentMethod === "stripe" ? "Pay with card" : "Place order";
  }, [form.paymentMethod, submitting, pricingLoading, priced]);

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
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: spacing.lg,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <OrderSummarySection
            cart={cart}
            getPricedItem={getPricedItem}
            currency={priced?.currency}
          />

          <View style={styles.card} onLayout={(event) => {
            for (const field of ["fullName", "email", "phone"] as const) fieldPositions.current[field] = event.nativeEvent.layout.y;
          }}>
            <Text style={styles.cardTitle}>1. Contact information</Text>
            <Input
              ref={(input) => { inputRefs.current.fullName = input; }}
              label="Full name *"
              value={form.fullName}
              onChangeText={(value) => updateField("fullName", value)}
              onBlur={() => touchField("fullName")}
              error={visibleErrors.fullName}
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              onSubmitEditing={() => inputRefs.current.email?.focus()}
              editable={!submitting}
            />
            <Input
              ref={(input) => { inputRefs.current.email = input; }}
              label="Email *"
              value={form.email}
              onChangeText={(value) => updateField("email", value)}
              onBlur={() => touchField("email")}
              error={visibleErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              editable={!submitting}
            />
            <PhoneInput
              inputRef={phoneRef}
              label="Phone number *"
              value={form.phone}
              onChange={(value) => updateField("phone", value)}
              onBlur={() => touchField("phone")}
              error={visibleErrors.phone}
              disabled={submitting}
              onSubmitEditing={() => focusField("address")}
            />
          </View>

          <View style={styles.card} onLayout={(event) => {
            for (const field of ["address", "city", "region", "postalCode", "country", "notes"] as const) fieldPositions.current[field] = event.nativeEvent.layout.y;
          }}>
            <Text style={styles.cardTitle}>2. Delivery address</Text>
            <Input
              ref={(input) => { inputRefs.current.address = input; }}
              label={form.structuredAddress ? "Street address *" : "Saved delivery address *"}
              value={form.address}
              onChangeText={(value) => updateField("address", value)}
              onBlur={() => touchField("address")}
              error={visibleErrors.address}
              placeholder={form.structuredAddress ? "House / apartment, street or area" : "Street address, city, region and country"}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={styles.textArea}
              autoComplete="street-address"
              textContentType="fullStreetAddress"
              editable={!submitting}
              hint={form.structuredAddress ? "Include your house or apartment number." : "Your saved address is preserved. You can update it here or enter separate address fields."}
            />
            {form.structuredAddress ? <>
              <Input ref={(input) => { inputRefs.current.city = input; }} label="City *" value={form.city ?? ""}
                onChangeText={(value) => updateField("city", value)} onBlur={() => touchField("city")} error={visibleErrors.city}
                autoComplete="postal-address-locality" textContentType="addressCity" returnKeyType="next" onSubmitEditing={() => inputRefs.current.region?.focus()} editable={!submitting} />
              <Input ref={(input) => { inputRefs.current.region = input; }} label="State / province (optional)" value={form.region ?? ""}
                onChangeText={(value) => updateField("region", value)} onBlur={() => touchField("region")} error={visibleErrors.region}
                autoComplete="postal-address-region" textContentType="addressState" returnKeyType="next" onSubmitEditing={() => inputRefs.current.postalCode?.focus()} editable={!submitting} />
              <Input ref={(input) => { inputRefs.current.postalCode = input; }} label="Postal code (optional)" value={form.postalCode ?? ""}
                onChangeText={(value) => updateField("postalCode", value)} onBlur={() => touchField("postalCode")} error={visibleErrors.postalCode}
                autoComplete="postal-code" textContentType="postalCode" autoCapitalize="characters" returnKeyType="done" editable={!submitting} />
              <CheckoutCountryPicker value={form.country ?? ""} onChange={(value) => { updateField("country", value); touchField("country"); }} error={visibleErrors.country} disabled={submitting} />
            </> : <Button label="Enter separate address fields" variant="ghost" onPress={() => updateField("structuredAddress", true)} disabled={submitting} />}
            <Input
              ref={(input) => { inputRefs.current.notes = input; }}
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
              editable={!submitting}
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

          <View style={styles.card} onLayout={(event) => { fieldPositions.current.paymentMethod = event.nativeEvent.layout.y; }}>
            <PaymentMethodSelector
              value={form.paymentMethod}
              onChange={(method: PaymentMethod) => {
                updateField("paymentMethod", method);
                touchField("paymentMethod");
              }}
              error={visibleErrors.paymentMethod}
              disabled={submitting}
              cardAvailable={cardAvailable}
            />
          </View>

          <PromotionAppliedSection
            gifts={giftItems.map((item) => ({ productName: item.productName ?? "Gift item", color: item.color, quantity: item.quantity ?? 1, imageUrl: item.imageUrl, promotionName: item.promotionName }))}
            summaries={priced?.promotionSummaries}
            promotionSavingsTotal={priced?.promotionSavingsTotal}
            currency={priced?.currency}
          />

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

          <View style={styles.card} onLayout={(event) => {
            fieldPositions.current.termsAccepted = event.nativeEvent.layout.y;
            fieldPositions.current.privacyAccepted = event.nativeEvent.layout.y;
          }}>
            <Text style={styles.cardTitle}>Review store policies</Text>
            <View style={styles.policyLinks}>
              {CHECKOUT_POLICIES.map((item) => <Pressable key={item.key} accessibilityRole="link" onPress={() => { Keyboard.dismiss(); setPolicy(item.key); }} style={styles.policyLink}>
                <Text style={styles.policyLinkText}>{item.title}</Text>
              </Pressable>)}
            </View>
            <Checkbox
              checked={form.termsAccepted}
              onChange={(checked) => {
                updateField("termsAccepted", checked);
                touchField("termsAccepted");
              }}
              label="I accept the Terms & Conditions, Shipping and Return policies."
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
            disabled={submitting || pricingLoading || !isOnline || !priced}
            onPress={() => void handleSubmit()}
          />
        </View>
        {policy ? <CheckoutPolicySheet policy={policy} onClose={() => setPolicy(null)} /> : null}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function createIndexStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
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
    color: colors.foreground,
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
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  policyLinks: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  policyLink: { minHeight: 48, justifyContent: "center", paddingHorizontal: spacing.sm },
  policyLinkText: { color: colors.primary, fontSize: typography.sm, textDecorationLine: "underline" },
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
}


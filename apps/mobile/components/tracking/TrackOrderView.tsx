import { useAction } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CustomerOrderCard,
  TrackOrderResultCard,
} from "@/components/tracking/TrackOrderCards";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { api } from "@/lib/convex-api";
import type { OrderStatus } from "@/lib/order-display";
import {
  hasTrackByCustomerErrors,
  hasTrackByOrderErrors,
  validateTrackByCustomerForm,
  validateTrackByOrderForm,
  type TrackByCustomerErrors,
  type TrackByOrderErrors,
} from "@/lib/validation/track-order-form";
import { useToast } from "@/providers/toast-context";

type TrackMethod = "order-number" | "customer";
type CustomerField = "email" | "phone";

const TRACK_METHOD_OPTIONS = [
  { value: "order-number" as const, label: "Order Number" },
  { value: "customer" as const, label: "Email / Phone" },
];

const CUSTOMER_FIELD_OPTIONS = [
  { value: "email" as const, label: "Email" },
  { value: "phone" as const, label: "Phone" },
];

function getTrackingErrorMessage(
  result: { found: false; message: string; rateLimited?: true } | { found: true }
): string | null {
  if (result.found) return null;
  if (result.rateLimited) {
    return "Too many tracking attempts. Please wait a moment and try again.";
  }
  return "We couldn't find an order with those details. Please check your information and try again.";
}

export function TrackOrderView() {
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useLayoutMetrics();
  const { showError } = useToast();
  const params = useLocalSearchParams<{ orderNumber?: string }>();

  const trackByOrderNumber = useAction(api.orderTracking.trackByOrderNumber);
  const trackByCustomer = useAction(api.orderTracking.trackByCustomer);

  const prefillOrderNumber =
    typeof params.orderNumber === "string" ? params.orderNumber.trim() : "";

  const [trackMethod, setTrackMethod] = useState<TrackMethod>("order-number");
  const [customerField, setCustomerField] = useState<CustomerField>("email");
  const [orderNumber, setOrderNumber] = useState(prefillOrderNumber);
  const prefillHandledRef = useRef(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderErrors, setOrderErrors] = useState<TrackByOrderErrors>({});
  const [customerErrors, setCustomerErrors] = useState<TrackByCustomerErrors>({});
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [orderResult, setOrderResult] = useState<
    Awaited<ReturnType<typeof trackByOrderNumber>> | null
  >(null);
  const [customerResults, setCustomerResults] = useState<
    Awaited<ReturnType<typeof trackByCustomer>> | null
  >(null);

  const runOrderSearch = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      const errors = validateTrackByOrderForm({ orderNumber: trimmed });
      setOrderErrors(errors);
      if (hasTrackByOrderErrors(errors)) return;

      setIsSearchingOrder(true);
      setOrderResult(null);
      Keyboard.dismiss();

      try {
        const result = await trackByOrderNumber({ orderNumber: trimmed });
        setOrderResult(result);
        const message = getTrackingErrorMessage(result);
        if (message) showError(message);
      } catch {
        showError("Something went wrong. Please check your connection and try again.");
      } finally {
        setIsSearchingOrder(false);
      }
    },
    [showError, trackByOrderNumber]
  );

  const runCustomerSearch = useCallback(
    async (email: string, phone: string) => {
      const errors = validateTrackByCustomerForm({ email, phone });
      setCustomerErrors(errors);
      if (hasTrackByCustomerErrors(errors)) return;

      setIsSearchingCustomer(true);
      setCustomerResults(null);
      Keyboard.dismiss();

      try {
        const result = await trackByCustomer({
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        });
        setCustomerResults(result);
        const message = getTrackingErrorMessage(result);
        if (message) showError(message);
      } catch {
        showError("Something went wrong. Please check your connection and try again.");
      } finally {
        setIsSearchingCustomer(false);
      }
    },
    [showError, trackByCustomer]
  );

  useEffect(() => {
    if (!prefillOrderNumber || prefillHandledRef.current) return;
    prefillHandledRef.current = true;
    void runOrderSearch(prefillOrderNumber);
  }, [prefillOrderNumber, runOrderSearch]);

  const openAiAssistant = () => {
    router.push({
      pathname: "/(tabs)/ai",
      params: {
        context: "order_tracking",
        orderNumber: orderNumber.trim() || undefined,
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: insets.bottom + spacing["2xl"],
            },
          ]}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="locate-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Track your order</Text>
            <Text style={styles.heroSub}>
              Enter your order number or the contact details used at checkout to see
              your delivery progress.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ask AI about my order"
              onPress={openAiAssistant}
              style={({ pressed }) => [styles.aiLink, pressed && styles.aiLinkPressed]}
            >
              <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
              <Text style={styles.aiLinkText}>Ask AI about my order</Text>
            </Pressable>
          </View>

          <SegmentedControl
            options={TRACK_METHOD_OPTIONS}
            value={trackMethod}
            onChange={setTrackMethod}
            accessibilityLabel="Tracking method"
          />

          {trackMethod === "order-number" ? (
            <Card style={styles.formCard}>
              <Text style={styles.cardHeading}>Track by order number</Text>
              <Text style={styles.cardHint}>
                Your order number is in your confirmation email and on the checkout
                success page.
              </Text>
              <Input
                label="Order number"
                value={orderNumber}
                onChangeText={setOrderNumber}
                placeholder="ORD-20260101-ABC123"
                autoCapitalize="characters"
                autoCorrect={false}
                error={orderErrors.orderNumber}
                accessibilityLabel="Order number"
              />
              <Button
                label={isSearchingOrder ? "Tracking…" : "Track order"}
                loading={isSearchingOrder}
                fullWidth
                onPress={() => void runOrderSearch(orderNumber)}
                accessibilityLabel="Track order"
              />

              {orderResult?.found ? (
                <TrackOrderResultCard
                  orderNumber={orderResult.order.orderNumber}
                  status={orderResult.order.status as OrderStatus}
                  paymentMethod={orderResult.order.paymentMethod}
                  paymentStatus={orderResult.order.paymentStatus}
                  total={orderResult.order.total}
                  currency={orderResult.order.currency}
                  createdAt={orderResult.order.createdAt}
                  paidAt={orderResult.order.paidAt}
                  itemCount={orderResult.order.items.length}
                />
              ) : null}
            </Card>
          ) : (
            <Card style={styles.formCard}>
              <Text style={styles.cardHeading}>Track by customer info</Text>
              <Text style={styles.cardHint}>
                Provide the email address or phone number from your order — you only
                need one of them.
              </Text>

              {customerErrors.form ? (
                <Text accessibilityRole="alert" style={styles.formError}>
                  {customerErrors.form}
                </Text>
              ) : null}

              <SegmentedControl
                options={CUSTOMER_FIELD_OPTIONS}
                value={customerField}
                onChange={setCustomerField}
                accessibilityLabel="Customer contact method"
              />

              {customerField === "email" ? (
                <Input
                  label="Email address"
                  value={customerEmail}
                  onChangeText={setCustomerEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={customerErrors.email}
                  accessibilityLabel="Email address"
                />
              ) : (
                <Input
                  label="Phone number"
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  placeholder="+1 800 555 0199"
                  keyboardType="phone-pad"
                  error={customerErrors.phone}
                  accessibilityLabel="Phone number"
                />
              )}

              <Button
                label={isSearchingCustomer ? "Finding orders…" : "Find my orders"}
                loading={isSearchingCustomer}
                fullWidth
                onPress={() =>
                  void runCustomerSearch(
                    customerField === "email" ? customerEmail : "",
                    customerField === "phone" ? customerPhone : ""
                  )
                }
                accessibilityLabel="Find my orders"
              />

              {customerResults?.found && customerResults.orders.length > 0 ? (
                <View style={styles.resultsList}>
                  <Text style={styles.resultsHeading}>
                    {customerResults.orders.length} order
                    {customerResults.orders.length === 1 ? "" : "s"} found
                  </Text>
                  {customerResults.orders.map((order) => (
                    <CustomerOrderCard
                      key={order.orderNumber}
                      order={{
                        orderNumber: order.orderNumber,
                        status: order.status as OrderStatus,
                        total: order.total,
                        currency: order.currency,
                        createdAt: order.createdAt,
                      }}
                    />
                  ))}
                </View>
              ) : null}
            </Card>
          )}
        </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  hero: {
    alignItems: "center",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  heroTitle: {
    ...textStyles.display,
    fontSize: typography["3xl"],
    textAlign: "center",
  },
  heroSub: {
    ...textStyles.body,
    textAlign: "center",
    color: colors.textSecondary,
    maxWidth: 340,
  },
  aiLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(98, 84, 243, 0.3)",
    backgroundColor: colors.surface,
  },
  aiLinkPressed: {
    backgroundColor: colors.primaryMuted,
  },
  aiLinkText: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.primary,
  },
  formCard: {
    gap: spacing.lg,
    borderRadius: radius.lg,
  },
  cardHeading: {
    ...textStyles.sectionTitle,
    fontSize: typography.xl,
  },
  cardHint: {
    ...textStyles.bodySmall,
    marginTop: -spacing.sm,
  },
  formError: {
    fontSize: typography.sm,
    color: colors.destructive,
    backgroundColor: colors.destructiveMuted,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  resultsList: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  resultsHeading: {
    ...textStyles.sectionTitle,
    fontSize: typography.base,
  },
});

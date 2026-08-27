import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Header } from "@/components/layout/Header";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { radius, spacing } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";
import { loadLastOrderInfo } from "@/lib/checkout-customer-storage";
import { api } from "@/lib/convex-api";
import { useTheme } from "@/providers/theme-context";

export default function CheckoutCancelScreen() {
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useLayoutMetrics();
  const rootStyle = useScreenRootStyle();
  const { colors, textStyles } = useTheme();
  const params = useLocalSearchParams<{
    orderNumber?: string;
    accessToken?: string;
  }>();
  const paramOrderNumber =
    typeof params.orderNumber === "string" ? params.orderNumber : undefined;
  const paramAccessToken =
    typeof params.accessToken === "string" ? params.accessToken : undefined;

  const acknowledgeCancelled = useMutation(api.orders.acknowledgeStripeCheckoutCancelled);
  const acknowledgedRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadLastOrderInfo();
      if (cancelled) return;
      const orderNumber = paramOrderNumber ?? stored.orderNumber ?? undefined;
      const accessToken = paramAccessToken ?? stored.accessToken ?? undefined;
      const customerEmail = stored.email ?? undefined;
      if (!orderNumber || acknowledgedRef.current === orderNumber) return;
      if (!accessToken && !customerEmail) return;
      acknowledgedRef.current = orderNumber;
      void acknowledgeCancelled({
        orderNumber,
        accessToken,
        customerEmail,
      }).catch(() => {
        // Non-blocking cleanup
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [acknowledgeCancelled, paramAccessToken, paramOrderNumber]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        content: {
          paddingTop: spacing["3xl"],
          alignItems: "center",
          gap: spacing.lg,
        },
        iconWrap: {
          width: 96,
          height: 96,
          borderRadius: radius.full,
          backgroundColor: colors.warningMuted,
          alignItems: "center",
          justifyContent: "center",
        },
        title: {
          ...textStyles.screenTitle,
          textAlign: "center",
        },
        subtitle: {
          ...textStyles.bodySmall,
          textAlign: "center",
          maxWidth: 320,
          lineHeight: 22,
        },
        orderRef: {
          fontWeight: "700",
          color: colors.foreground,
        },
        actions: {
          width: "100%",
          gap: spacing.sm,
          marginTop: spacing.md,
        },
      }),
    [colors, textStyles]
  );

  return (
    <ScreenContainer>
      <View style={[styles.container, rootStyle]}>
        <Header title="Payment cancelled" showBack showSearch={false} showCart={false} />

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
          <View style={styles.iconWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.warning} />
          </View>

          <Text style={styles.title}>Payment cancelled</Text>
          <Text style={styles.subtitle}>
            Your payment was not completed. No charges were made.
            {paramOrderNumber ? (
              <>
                {"\n\n"}
                Order reference: <Text style={styles.orderRef}>{paramOrderNumber}</Text>
              </>
            ) : null}
          </Text>

          <View style={styles.actions}>
            <Button
              label="Try checkout again"
              fullWidth
              onPress={() => router.replace("/checkout" as Href)}
            />
            <Button
              label="Return to cart"
              variant="outline"
              fullWidth
              onPress={() => router.replace("/(tabs)/cart")}
            />
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

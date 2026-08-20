import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Header } from "@/components/layout/Header";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { api } from "@/lib/convex-api";

export default function CheckoutCancelScreen() {
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useLayoutMetrics();
  const params = useLocalSearchParams<{ orderNumber?: string }>();
  const orderNumber =
    typeof params.orderNumber === "string" ? params.orderNumber : undefined;

  const acknowledgeCancelled = useMutation(api.orders.acknowledgeStripeCheckoutCancelled);
  const acknowledgedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!orderNumber || acknowledgedRef.current === orderNumber) return;
    acknowledgedRef.current = orderNumber;
    void acknowledgeCancelled({ orderNumber }).catch(() => {
      // Non-blocking cleanup
    });
  }, [acknowledgeCancelled, orderNumber]);

  return (
    <ScreenContainer>
      <View style={styles.container}>
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
            {orderNumber ? (
              <>
                {"\n\n"}
                Order reference: <Text style={styles.orderRef}>{orderNumber}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: spacing["3xl"],
    alignItems: "center",
    gap: spacing.lg,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: "#FEF3C7",
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
});

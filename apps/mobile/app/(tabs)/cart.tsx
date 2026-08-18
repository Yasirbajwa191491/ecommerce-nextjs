import { formatCurrencyAmount } from "@ecommerce/shared";
import { router } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CartLineItem } from "@/components/cart/CartLineItem";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useCartPricing } from "@/hooks/useCartPricing";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { useCart } from "@/providers/cart-context";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useLayoutMetrics();
  const {
    cart,
    itemCount,
    hydrated,
    incrementItem,
    decrementItem,
    removeItem,
  } = useCart();
  const { priced, pricingError, isLoading, getPricedItem } = useCartPricing(cart);

  if (!hydrated) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <Header title="Cart" showSearch={false} showCart={false} />
          <View style={[styles.loadingWrap, { paddingHorizontal: horizontalPadding }]}>
            <Skeleton height={100} borderRadius={radius.lg} />
            <Skeleton height={100} borderRadius={radius.lg} />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (itemCount === 0) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <Header title="Cart" showSearch={false} showCart={false} />
          <EmptyState
            icon="cart-outline"
            title="Your cart is waiting"
            description="Browse the shop and add items. Your selections are saved on this device."
            actionLabel="Start Shopping"
            onAction={() => router.push("/(tabs)/shop")}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (pricingError && !isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <Header title="Cart" showSearch={false} showCart={false} />
          <ErrorState
            title="Couldn't update cart"
            message={getFriendlyErrorMessage(pricingError)}
            onRetry={() => router.replace("/(tabs)/cart")}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Header
          title="Cart"
          subtitle={`${itemCount} item${itemCount === 1 ? "" : "s"}`}
          showSearch={false}
          showCart={false}
        />

        <FlatList
          data={cart}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: horizontalPadding },
          ]}
          renderItem={({ item }) => {
            const pricedItem = getPricedItem(item);
            return (
              <CartLineItem
                item={item}
                lineTotal={pricedItem?.lineTotal}
                onIncrement={() => incrementItem(item.id)}
                onDecrement={() => decrementItem(item.id)}
                onRemove={() => removeItem(item.id)}
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />

        <View
          style={[
            styles.summary,
            { paddingHorizontal: horizontalPadding, paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          {pricingError ? (
            <Text style={styles.errorText}>{getFriendlyErrorMessage(pricingError)}</Text>
          ) : null}

          {priced?.promotionSummaries && priced.promotionSummaries.length > 0 ? (
            <View style={styles.promoSection}>
              {priced.promotionSummaries.map((promo, i) => (
                <View key={i} style={styles.promoRow}>
                  <Text style={styles.promoLabel}>{promo.promotionName}</Text>
                  <Text style={styles.promoSavings}>
                    -{formatCurrencyAmount(promo.savingsAmount)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              {isLoading ? "…" : formatCurrencyAmount(priced?.subtotal ?? 0)}
            </Text>
          </View>

          {(priced?.discountTotal ?? 0) > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discounts</Text>
              <Text style={styles.discountValue}>
                -{formatCurrencyAmount(priced!.discountTotal)}
              </Text>
            </View>
          ) : null}

          {(priced?.shipping ?? 0) > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>
                {formatCurrencyAmount(priced!.shipping)}
              </Text>
            </View>
          ) : null}

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Estimated total</Text>
            <Text style={styles.totalValue}>
              {isLoading ? "…" : formatCurrencyAmount(priced?.total ?? 0)}
            </Text>
          </View>

          <Button
            label="Proceed to Checkout"
            fullWidth
            size="lg"
            onPress={() => router.push("/checkout")}
            loading={isLoading}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingWrap: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  separator: {
    height: spacing.md,
  },
  summary: {
    backgroundColor: colors.surface,
    paddingTop: spacing.lg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: typography.sm,
    color: colors.destructive,
    textAlign: "center",
  },
  promoSection: {
    gap: 4,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  promoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  promoLabel: {
    fontSize: typography.sm,
    color: colors.primary,
  },
  promoSavings: {
    fontSize: typography.sm,
    color: colors.success,
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: typography.sm,
    color: colors.foreground,
    fontWeight: "500",
  },
  discountValue: {
    fontSize: typography.sm,
    color: colors.success,
    fontWeight: "600",
  },
  totalRow: {
    paddingTop: spacing.sm,
    marginBottom: spacing.md,
  },
  totalLabel: {
    ...textStyles.sectionTitle,
    fontSize: typography.base,
  },
  totalValue: {
    fontSize: typography.xl,
    fontWeight: "800",
    color: colors.foreground,
  },
});

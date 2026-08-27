import { formatCurrencyAmount } from "@ecommerce/shared";
import { router, type Href } from "expo-router";
import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CartLineItem } from "@/components/cart/CartLineItem";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  createTextStyles,
  radius,
  spacing,
  typography,
  type ColorPalette,
} from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";
import { useCartPricing } from "@/hooks/useCartPricing";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { useCart } from "@/providers/cart-context";
import { useTheme } from "@/providers/theme-context";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useLayoutMetrics();
  const rootStyle = useScreenRootStyle();
  const { colors, textStyles } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, textStyles),
    [colors, textStyles]
  );
  const {
    cart,
    itemCount,
    hydrated,
    incrementItem,
    decrementItem,
    removeItem,
  } = useCart();
  const { priced, pricingError, mixedCurrency, isLoading, isOffline, getPricedItem, getItemCurrency } =
    useCartPricing(cart);
  const cartCurrency = priced?.currency ?? cart[0]?.currency;
  const isOnline = useOnlineStatus();
  const canCheckout = !isLoading && !isOffline && isOnline && !pricingError && Boolean(priced);

  if (!hydrated) {
    return (
      <ScreenContainer>
        <View style={[styles.container, rootStyle]}>
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
        <View style={[styles.container, rootStyle]}>
          <Header title="Cart" showSearch={false} showCart={false} />
          <EmptyState
            icon="cart-outline"
            title="Your cart is empty"
            description="Discover products picked for you."
            actionLabel="Start Shopping"
            onAction={() => router.push("/(tabs)/shop")}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={[styles.container, rootStyle]}>
        <Header
          title="Cart"
          subtitle={`${itemCount} item${itemCount === 1 ? "" : "s"}`}
          showSearch={false}
          showCart={false}
        />

        <FlatList
          style={styles.list}
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
                currency={getItemCurrency(item)}
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
          {isOffline ? (
            <Text style={styles.offlineText}>
              You&apos;re offline. Prices and availability will be checked when you&apos;re back
              online.
            </Text>
          ) : null}

          {pricingError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorTitle}>
                {mixedCurrency ? "Different currencies in cart" : "Couldn't update cart"}
              </Text>
              <Text style={styles.errorText}>{getFriendlyErrorMessage(pricingError)}</Text>
            </View>
          ) : null}

          {priced?.promotionSummaries && priced.promotionSummaries.length > 0 ? (
            <View style={styles.promoSection}>
              {priced.promotionSummaries.map((promo, i) => (
                <View key={i} style={styles.promoRow}>
                  <Text style={styles.promoLabel}>{promo.promotionName}</Text>
                  <Text style={styles.promoSavings}>
                    -{formatCurrencyAmount(promo.savingsAmount, cartCurrency)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {priced && !pricingError ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>
                  {isLoading || isOffline
                    ? "…"
                    : formatCurrencyAmount(priced.subtotal, cartCurrency)}
                </Text>
              </View>

              {(priced.discountTotal ?? 0) > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discounts</Text>
                  <Text style={styles.discountValue}>
                    -{formatCurrencyAmount(priced.discountTotal, cartCurrency)}
                  </Text>
                </View>
              ) : null}

              {(priced.shipping ?? 0) > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shipping</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrencyAmount(priced.shipping, cartCurrency)}
                  </Text>
                </View>
              ) : null}

              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Estimated total</Text>
                <Text style={styles.totalValue}>
                  {isLoading || isOffline ? "…" : formatCurrencyAmount(priced.total, cartCurrency)}
                </Text>
              </View>
              <Text style={styles.offlineText}>
                Delivery method is chosen at checkout and may change this total.
              </Text>
            </>
          ) : !pricingError ? (
            <>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Estimated total</Text>
                <Text style={styles.totalValue}>
                  {isLoading || isOffline ? "…" : formatCurrencyAmount(0, cartCurrency)}
                </Text>
              </View>
              <Text style={styles.offlineText}>
                Delivery method is chosen at checkout and may change this total.
              </Text>
            </>
          ) : null}

          <Button
            label={
              isOffline
                ? "Internet required to checkout"
                : mixedCurrency
                  ? "Unify currencies to checkout"
                  : "Proceed to Checkout"
            }
            fullWidth
            size="lg"
            onPress={() => router.push("/checkout" as Href)}
            loading={isLoading}
            disabled={!canCheckout}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

function createStyles(
  colors: ColorPalette,
  textStyles: ReturnType<typeof createTextStyles>
) {
  return StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingWrap: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  list: {
    flex: 1,
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
  errorBanner: {
    gap: 4,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.destructiveMuted,
  },
  errorTitle: {
    fontSize: typography.sm,
    fontWeight: "700",
    color: colors.destructive,
    textAlign: "center",
  },
  errorText: {
    fontSize: typography.sm,
    color: colors.destructive,
    textAlign: "center",
    lineHeight: 20,
  },
  offlineText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
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
}

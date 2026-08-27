import { getPrimaryImageUrl } from "@ecommerce/shared";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AddToCartSheet } from "@/components/cart/AddToCartSheet";
import { EmptyState } from "@/components/feedback/EmptyState";
import { OfflineNotice } from "@/components/feedback/OfflineNotice";
import { CachedDataNotice } from "@/components/feedback/CachedDataNotice";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/layout/Header";
import { MobileFooter } from "@/components/layout/MobileFooter";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { Button } from "@/components/ui/Button";
import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";
import { useWishlist } from "@/hooks/useWishlist";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { getCachedProducts } from "@/lib/offline/product-store";
import { api } from "@/lib/convex-api";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { useToast } from "@/providers/toast-context";
import type { Id } from "@convex/_generated/dataModel";

export default function WishlistScreen() {
  const { horizontalPadding } = useLayoutMetrics();
  const rootStyle = useScreenRootStyle();
  const { isOffline } = useNetworkStatus();
  const { wishlistIds, isLoading, toggle } = useWishlist();
  const { showError, showSuccess } = useToast();
  const [addSheetProductId, setAddSheetProductId] = useState<Id<"products"> | null>(
    null
  );

  const liveProducts = useQuery(
    api.products.listByIds,
    !isOffline && wishlistIds.length ? { ids: wishlistIds } : "skip"
  );

  const cachedProducts = useMemo(
    () => getCachedProducts(wishlistIds),
    [wishlistIds]
  );

  const products = liveProducts ?? (isOffline ? cachedProducts : undefined);

  const loading =
    wishlistIds.length > 0 &&
    !isOffline &&
    isLoading &&
    products === undefined;

  const showOfflineProductNotice =
    isOffline && wishlistIds.length > 0 && cachedProducts.length > 0;

  return (
    <ScreenContainer>
      <View style={[styles.container, rootStyle]}>
        <Header title="Wishlist" showBack showSearch={false} showCart />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : wishlistIds.length === 0 ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: horizontalPadding }}>
            <EmptyState
              icon="heart-outline"
              title="Your wishlist is empty"
              description="Tap the heart on any product to save it here."
              actionLabel="Browse products"
              onAction={() => router.push("/(tabs)/shop")}
              compact
            />
            <MobileFooter compactBottom />
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.listContent,
              { paddingHorizontal: horizontalPadding },
            ]}
          >
            {showOfflineProductNotice ? (
              <CachedDataNotice
                title="Offline wishlist"
                message="Showing saved items. Changes sync when you're back online."
              />
            ) : null}

            {products?.map((product) => {
              const outOfStock = product.stock <= 0;
              const discountPercent = product.discountPercent ?? 0;
              const displayPrice =
                discountPercent > 0
                  ? product.price * (1 - discountPercent / 100)
                  : product.price;

              return (
                <View key={product._id} style={styles.item}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(`/product/${product._id}`)}
                    style={styles.itemMain}
                  >
                    <View style={styles.thumbWrap}>
                      {getPrimaryImageUrl(product) ? (
                        <Image
                          source={{ uri: getPrimaryImageUrl(product) }}
                          style={styles.thumb}
                          contentFit="cover"
                        />
                      ) : null}
                    </View>
                    <View style={styles.itemCopy}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {product.name}
                      </Text>
                      <Text style={styles.itemBrand}>{product.company}</Text>
                      <PriceDisplay
                        price={displayPrice}
                        originalPrice={discountPercent > 0 ? product.price : undefined}
                        currency={product.currency}
                        size="sm"
                      />
                      <Text style={styles.stock}>
                        {outOfStock ? "Out of stock" : "In stock"}
                      </Text>
                    </View>
                  </Pressable>

                  <View style={styles.itemActions}>
                    <Button
                      label="Add to cart"
                      disabled={outOfStock}
                      onPress={() => setAddSheetProductId(product._id as Id<"products">)}
                      style={styles.actionBtn}
                    />
                    <Button
                      label="Remove"
                      variant="outline"
                      onPress={() => {
                        void (async () => {
                          try {
                            await toggle(product._id as Id<"products">);
                            showSuccess("Removed from wishlist");
                          } catch (error) {
                            showError(
                              getFriendlyErrorMessage(error, "Couldn't remove item.")
                            );
                          }
                        })();
                      }}
                      style={styles.actionBtn}
                    />
                  </View>
                </View>
              );
            })}

            {isOffline && wishlistIds.length > 0 && !products?.length ? (
              <OfflineNotice
                title="You're offline"
                message="Saved product details aren't available yet. Open items while online to cache them."
                onRetry={() => router.replace("/wishlist" as Href)}
              />
            ) : null}

            <MobileFooter compactBottom />
          </ScrollView>
        )}

        <AddToCartSheet
          visible={addSheetProductId != null}
          productId={addSheetProductId}
          onClose={() => setAddSheetProductId(null)}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: spacing["3xl"],
    gap: spacing.md,
  },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  itemMain: {
    flexDirection: "row",
    gap: spacing.md,
  },
  thumbWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.borderLight,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  itemCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  itemName: {
    ...textStyles.cardTitle,
    fontSize: typography.base,
  },
  itemBrand: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  stock: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  itemActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});

import { Ionicons } from "@expo/vector-icons";

import { useLocalSearchParams, router } from "expo-router";

import { useQuery } from "convex/react";

import { useCallback, useEffect, useMemo, useState } from "react";

import {

  Pressable,

  ScrollView,

  Share,

  StyleSheet,

  Text,

  View,

} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";



import { EmptyState } from "@/components/feedback/EmptyState";
import { CachedDataNotice } from "@/components/feedback/CachedDataNotice";
import { OfflineNotice } from "@/components/feedback/OfflineNotice";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { HomeSection } from "@/components/home/HomeSection";
import { ProductCarousel } from "@/components/products/ProductCarousel";
import { ProductDeliverySection } from "@/components/products/ProductDeliverySection";
import { ProductImageGallery } from "@/components/products/ProductImageGallery";
import { ProductWarrantySection } from "@/components/products/ProductWarrantySection";
import { PromotionOfferBanner } from "@/components/products/PromotionOfferBanner";
import { RatingStars } from "@/components/products/RatingStars";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { PressableScale } from "@/components/ui/PressableScale";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { ProductDetailSkeleton } from "@/components/ui/Skeleton";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import {
  colors,
  radius,
  shadows,
  spacing,
  textStyles,
  typography,
} from "@/constants/theme";
import { useSimilarProducts } from "@/hooks/useSimilarProducts";
import { useStableNow } from "@/hooks/useStableNow";
import { useWishlist } from "@/hooks/useWishlist";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { canRenderColorSwatch, resolveSwatchBackground } from "@/lib/color-swatch";
import { resolveProductColorOrDefault } from "@/lib/cart-lines";
import { api } from "@/lib/convex-api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { formatShippingLine } from "@/lib/product-display";
import { getPromotionDisplay } from "@/lib/promotion-display";
import { getCachedProduct } from "@/lib/offline/product-store";
import { offlineKeys } from "@/lib/offline/keys";
import { useCart } from "@/providers/cart-context";
import { useToast } from "@/providers/toast-context";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { orderImagesForDisplay } from "@ecommerce/shared";
import type { Id } from "@convex/_generated/dataModel";



export default function ProductDetailScreen() {

  const { id } = useLocalSearchParams<{ id: string }>();

  const insets = useSafeAreaInsets();

  const now = useStableNow();

  const { addToCart, itemCount } = useCart();

  const { showError, showSuccess } = useToast();

  const { isWishlisted, toggle } = useWishlist();
  const { isOffline } = useNetworkStatus();
  const { record } = useRecentlyViewed();



  const productId = id as Id<"products"> | undefined;

  const liveProduct = useQuery(

    api.products.getById,

    productId ? { id: productId } : "skip"

  );

  const cachedProduct = useOfflineCache(
    productId ? `${offlineKeys.productStore}:${productId}` : offlineKeys.productStore,
    liveProduct ?? undefined
  );

  const product =
    liveProduct === null && !isOffline
      ? null
      : liveProduct ??
        cachedProduct.data ??
        (productId ? getCachedProduct(productId) : undefined);

  const fromCache = liveProduct === undefined && Boolean(product);

  useEffect(() => {
    if (product && product._id) {
      void record(product);
    }
  }, [product, record]);

  const promotions = useQuery(
    api.productPromotions.getActiveForProduct,
    productId ? { productId, now } : "skip"
  );

  const { products: similarProducts, loading: similarLoading, isEmpty: noSimilar } =
    useSimilarProducts(productId);

  const [selectedColor, setSelectedColor] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);



  const colorsList = product?.colors;

  const galleryImages = useMemo(
    () => (product ? orderImagesForDisplay(product) : []),
    [product]
  );

  const activeColor = useMemo(

    () =>

      product

        ? resolveProductColorOrDefault(
            colorsList ?? [],
            selectedColor || colorsList?.[0] || "#000000"
          )

        : "",

    [product, colorsList, selectedColor]

  );



  const discountPercent = product?.discountPercent ?? 0;

  const hasDiscount = discountPercent > 0;

  const displayPrice = product

    ? hasDiscount

      ? product.price * (1 - discountPercent / 100)

      : product.price

    : 0;



  const inStock = (product?.stock ?? 0) > 0;

  const wishlisted = product ? isWishlisted(product._id) : false;



  const handleAddToCart = useCallback(() => {
    if (!product || !inStock) {
      showError("Out of stock");
      return;
    }

    addToCart(product, activeColor, quantity);
    const promo = promotions?.[0];
    if (promo) {
      const { subtitle } = getPromotionDisplay(promo);
      showSuccess(`Added to cart — ${subtitle}`);
    } else {
      showSuccess("Added to cart");
    }
  }, [
    product,
    inStock,
    addToCart,
    activeColor,
    quantity,
    promotions,
    showError,
    showSuccess,
  ]);

  const handleViewCart = useCallback(() => {
    if (itemCount > 0) {
      router.push("/checkout");
      return;
    }
    router.push("/(tabs)/cart");
  }, [itemCount]);

  const handleImageIndexChange = useCallback(
    (index: number) => {
      setActiveImageIndex(index);
      const colorAtIndex = colorsList?.[index];
      if (colorAtIndex) {
        setSelectedColor(colorAtIndex);
      }
    },
    [colorsList]
  );

  const handleColorSelect = useCallback(
    (color: string) => {
      setSelectedColor(color);
      const colorIndex =
        colorsList?.findIndex(
          (entry) =>
            resolveProductColorOrDefault(colorsList, entry) ===
            resolveProductColorOrDefault(colorsList, color)
        ) ?? -1;
      if (colorIndex >= 0 && colorIndex < galleryImages.length) {
        setActiveImageIndex(colorIndex);
      }
    },
    [colorsList, galleryImages.length]
  );



  const handleShare = useCallback(async () => {

    if (!product) return;

    try {

      await Share.share({

        message: `Check out ${product.name}`,

        url: `https://ecommerce-nextjs-yasir.vercel.app/product/${product._id}`,

      });

    } catch {

      // User cancelled share

    }

  }, [product]);



  const handleAskAi = useCallback(() => {

    router.push({

      pathname: "/(tabs)/ai",

      params: product ? { productId: product._id, productName: product.name } : {},

    });

  }, [product]);



  if (!id) {

    return (

      <EmptyState

        icon="alert-circle-outline"

        title="Product not found"

        description="This product link is invalid."

      />

    );

  }



  if (product === undefined) {
    if (isOffline) {
      return (
        <ScreenContainer>
          <View style={styles.container}>
            <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
              <IconButton
                icon="chevron-back"
                accessibilityLabel="Go back"
                variant="surface"
                onPress={() => router.back()}
              />
            </View>
            <View style={{ padding: spacing.lg }}>
              <OfflineNotice
                title="You're offline"
                message="Connect to the internet to load this product."
                onRetry={() => router.replace(`/product/${id}`)}
              />
            </View>
          </View>
        </ScreenContainer>
      );
    }
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
            <IconButton
              icon="chevron-back"
              accessibilityLabel="Go back"
              variant="surface"
              onPress={() => router.back()}
            />
          </View>
          <ProductDetailSkeleton />
        </View>
      </ScreenContainer>
    );
  }



  if (product === null) {

    return (

      <EmptyState

        icon="cube-outline"

        title="Product unavailable"

        description="This product may have been removed or is no longer available."

      />

    );

  }



  return (

    <ScreenContainer>

      <View style={styles.container}>

        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>

          <IconButton

            icon="chevron-back"

            accessibilityLabel="Go back"

            variant="surface"

            onPress={() => router.back()}

          />

          <View style={styles.topActions}>

            <IconButton

              icon="share-outline"

              accessibilityLabel="Share product"

              variant="surface"

              onPress={() => void handleShare()}

            />

            <IconButton

              icon={wishlisted ? "heart" : "heart-outline"}

              accessibilityLabel={wishlisted ? "Remove product from wishlist" : "Add product to wishlist"}

              variant="surface"

              color={wishlisted ? colors.destructive : colors.foreground}

              onPress={() => {
                void (async () => {
                  try {
                    await toggle(product._id);
                  } catch (error) {
                    showError(
                      getFriendlyErrorMessage(error, "Couldn't update wishlist. Please try again.")
                    );
                  }
                })();
              }}

            />

          </View>

        </View>



        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces
        >

          <ProductImageGallery
            product={product}
            images={galleryImages}
            activeIndex={activeImageIndex}
            onActiveIndexChange={handleImageIndexChange}
          />

          <View style={styles.content}>
            {fromCache ? (
              <CachedDataNotice />
            ) : null}
            <View style={styles.badgeRow}>
              {product.category?.name ? (
                <Pressable
                  onPress={() =>
                    product.category?.slug
                      ? router.push(`/category/${product.category.slug}`)
                      : undefined
                  }
                >
                  <Badge label={product.category.name.toUpperCase()} variant="primary" />
                </Pressable>
              ) : null}
              {product.featured ? (
                <Badge label="Featured" variant="warning" />
              ) : null}
              <Badge
                label={inStock ? "In stock" : "Out of stock"}
                variant={inStock ? "success" : "destructive"}
              />
            </View>

            {product.company ? (
              <Text style={styles.brand}>{product.company.toUpperCase()}</Text>
            ) : null}

            <Text style={styles.name}>{product.name}</Text>

            <RatingStars rating={product.stars} reviewCount={product.reviews} />

            {product.description ? (
              <Text style={styles.shortDescription} numberOfLines={3}>
                {product.description}
              </Text>
            ) : null}

            {promotions && promotions.length > 0 && !fromCache ? (
              <View style={styles.promoSection}>
                {promotions.map((promo) => (
                  <PromotionOfferBanner key={promo._id} promotion={promo} now={now} />
                ))}
              </View>
            ) : null}

            <View style={styles.priceCard}>
              <View style={styles.priceHeader}>
                <Text style={styles.priceLabel}>Price</Text>
                {hasDiscount ? (
                  <Badge label={`-${discountPercent}%`} variant="destructive" />
                ) : null}
              </View>
              <PriceDisplay
                price={displayPrice}
                originalPrice={hasDiscount ? product.price : undefined}
                size="lg"
              />
              <View style={styles.shippingRow}>
                <Ionicons name="car-outline" size={16} color={colors.primary} />
                <Text
                  style={[
                    styles.shippingText,
                    product.shipping === true && styles.freeShippingText,
                  ]}
                >
                  {formatShippingLine(product)}
                </Text>
              </View>
            </View>

            <View style={styles.stockRow}>
              <View style={[styles.stockDot, inStock ? styles.inStockDot : styles.outStockDot]} />
              <Text style={[styles.stockText, !inStock && styles.outOfStock]}>
                {inStock ? `${product.stock} available` : "Out of stock"}
              </Text>
            </View>

            {colorsList && colorsList.length > 0 ? (
              <View style={styles.optionSection}>
                <Text style={styles.optionLabel}>Color</Text>
                <View style={styles.colorRow}>
                  {colorsList.map((color) => {
                    const resolved = resolveProductColorOrDefault(colorsList, color);
                    const selected = activeColor === resolved;
                    const swatchColor = resolveSwatchBackground(color);
                    const renderSwatch = canRenderColorSwatch(color);
                    return (
                      <Pressable
                        key={color}
                        accessibilityLabel={`Select color ${color}`}
                        onPress={() => handleColorSelect(color)}
                        style={[
                          renderSwatch ? styles.colorSwatch : styles.namedColorSwatch,
                          swatchColor ? { backgroundColor: swatchColor } : null,
                          selected && styles.colorSwatchActive,
                        ]}
                      >
                        {!renderSwatch ? (
                          <Text style={styles.namedColorText} numberOfLines={1}>
                            {color}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <ProductWarrantySection product={product} />
            <ProductDeliverySection product={product} />



            {product.description ? (

              <View style={styles.section}>

                <Text style={styles.sectionTitle}>Details</Text>

                <Text style={styles.description}>{product.description}</Text>

              </View>

            ) : null}



            {product.highlights && product.highlights.length > 0 ? (

              <View style={styles.section}>

                <Text style={styles.sectionTitle}>Highlights</Text>

                {product.highlights.map((item, i) => (

                  <View key={i} style={styles.highlightRow}>

                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />

                    <Text style={styles.highlightText}>{item}</Text>

                  </View>

                ))}

              </View>

            ) : null}



            <PressableScale onPress={handleAskAi} style={styles.aiEntry}>

              <View style={styles.aiIconWrap}>

                <Ionicons name="sparkles" size={18} color={colors.primary} />

              </View>

              <View style={styles.aiTextWrap}>

                <Text style={styles.aiEntryTitle}>Ask AI about this product</Text>

                <Text style={styles.aiEntrySubtitle}>Get personalized advice</Text>

              </View>

              <Ionicons name="chevron-forward" size={18} color={colors.muted} />

            </PressableScale>

          </View>



          {!noSimilar ? (

            <HomeSection title="Because you viewed this" subtitle="Similar products">

              <ProductCarousel

                products={similarProducts}

                isLoading={similarLoading}

              />

            </HomeSection>

          ) : null}



          <View style={{ height: 130 + insets.bottom }} />

        </ScrollView>



        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <QuantityStepper
            value={quantity}
            min={1}
            max={Math.max(1, product.stock)}
            onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
            onIncrement={() => setQuantity((q) => Math.min(product.stock, q + 1))}
          />

          <View style={styles.footerActions}>
            <Button
              label="Add to Cart"
              size="lg"
              onPress={handleAddToCart}
              disabled={!inStock}
              style={styles.footerCtaPrimary}
            />
            <View style={styles.viewCartWrap}>
              <Button
                label={itemCount > 0 ? "Checkout" : "View Cart"}
                variant="outline"
                size="lg"
                onPress={handleViewCart}
                style={styles.footerCta}
              />
              {itemCount > 0 ? (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{itemCount}</Text>
                </View>
              ) : null}
            </View>
          </View>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    width: "100%",
    paddingBottom: spacing.md,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },

  topActions: {

    flexDirection: "row",

    gap: spacing.sm,

  },

  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  brand: {
    ...textStyles.caption,
    color: colors.muted,
    letterSpacing: 0.8,
  },
  name: {
    ...textStyles.display,
    fontSize: 26,
    lineHeight: 32,
  },
  shortDescription: {
    ...textStyles.bodySmall,
    lineHeight: 20,
  },
  priceCard: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  priceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  priceLabel: {
    ...textStyles.caption,
    color: colors.muted,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  shippingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  shippingText: {
    ...textStyles.bodySmall,
    fontWeight: "600",
    color: colors.foreground,
  },
  freeShippingText: {
    color: colors.success,
  },

  stockRow: {

    flexDirection: "row",

    alignItems: "center",

    gap: spacing.sm,

  },

  stockDot: {

    width: 8,

    height: 8,

    borderRadius: radius.full,

  },

  inStockDot: {

    backgroundColor: colors.success,

  },

  outStockDot: {

    backgroundColor: colors.destructive,

  },

  stockText: {

    ...textStyles.bodySmall,

    color: colors.success,

    fontWeight: "600",

  },

  outOfStock: {

    color: colors.destructive,

  },

  promoSection: {
    gap: spacing.sm,
  },

  optionSection: {

    gap: spacing.sm,

    paddingTop: spacing.xs,

  },

  optionLabel: {

    ...textStyles.sectionTitle,

    fontSize: 15,

  },

  colorRow: {

    flexDirection: "row",

    gap: spacing.md,

  },

  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
  },
  colorSwatchActive: {
    borderColor: colors.primary,
    borderWidth: 3,
  },
  namedColorSwatch: {
    minWidth: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  namedColorText: {
    fontSize: typography.xs,
    fontWeight: "600",
    color: colors.foreground,
    maxWidth: 80,
  },

  section: {

    gap: spacing.sm,

    paddingTop: spacing.md,

    borderTopWidth: StyleSheet.hairlineWidth,

    borderTopColor: colors.borderLight,

  },

  sectionTitle: {

    ...textStyles.sectionTitle,

    fontSize: 17,

  },

  description: {

    ...textStyles.body,

    fontSize: 14,

    lineHeight: 22,

  },

  highlightRow: {

    flexDirection: "row",

    alignItems: "flex-start",

    gap: spacing.sm,

  },

  highlightText: {

    flex: 1,

    ...textStyles.body,

    fontSize: 14,

    lineHeight: 20,

  },

  aiEntry: {

    flexDirection: "row",

    alignItems: "center",

    gap: spacing.md,

    backgroundColor: colors.surface,

    padding: spacing.lg,

    borderRadius: radius.lg,

    marginTop: spacing.sm,

    ...shadows.card,

  },

  aiIconWrap: {

    width: 40,

    height: 40,

    borderRadius: radius.md,

    backgroundColor: colors.primaryMuted,

    alignItems: "center",

    justifyContent: "center",

  },

  aiTextWrap: {

    flex: 1,

    gap: 2,

  },

  aiEntryTitle: {

    ...textStyles.cardTitle,

    fontSize: 15,

  },

  aiEntrySubtitle: {

    ...textStyles.caption,

  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadows.md,
  },
  footerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  footerCtaPrimary: {
    flex: 1.4,
  },
  viewCartWrap: {
    flex: 1,
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -6,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    fontSize: typography.xs,
    fontWeight: "700",
    color: colors.primaryForeground,
  },

  footerCta: {
    flex: 1,
  },
});



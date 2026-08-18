import { Ionicons } from "@expo/vector-icons";

import { useLocalSearchParams, router } from "expo-router";

import { useQuery } from "convex/react";

import { useCallback, useMemo, useState } from "react";

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

import { LoadingView } from "@/components/feedback/LoadingView";

import { ScreenContainer } from "@/components/layout/ScreenContainer";

import { HomeSection } from "@/components/home/HomeSection";

import { ProductCarousel } from "@/components/products/ProductCarousel";

import { ProductImageGallery } from "@/components/products/ProductImageGallery";

import { RatingStars } from "@/components/products/RatingStars";

import { Button } from "@/components/ui/Button";

import { Badge } from "@/components/ui/Badge";

import { IconButton } from "@/components/ui/IconButton";

import { PressableScale } from "@/components/ui/PressableScale";

import { PriceDisplay } from "@/components/ui/PriceDisplay";

import {

  colors,

  radius,

  shadows,

  spacing,

  textStyles,

  touchTarget,

} from "@/constants/theme";

import { useSimilarProducts } from "@/hooks/useSimilarProducts";

import { useStableNow } from "@/hooks/useStableNow";

import { useWishlist } from "@/hooks/useWishlist";

import { resolveProductColorOrDefault } from "@/lib/cart-lines";

import { api } from "@/lib/convex-api";

import { useCart } from "@/providers/cart-context";

import { useToast } from "@/providers/toast-context";

import type { Id } from "@convex/_generated/dataModel";



export default function ProductDetailScreen() {

  const { id } = useLocalSearchParams<{ id: string }>();

  const insets = useSafeAreaInsets();

  const now = useStableNow();

  const { addToCart } = useCart();

  const { showError, showSuccess } = useToast();

  const { isWishlisted, toggle } = useWishlist();



  const productId = id as Id<"products"> | undefined;

  const product = useQuery(

    api.products.getById,

    productId ? { id: productId } : "skip"

  );

  const reviewSummary = useQuery(

    api.productReviews.getProductReviewSummary,

    productId ? { productId } : "skip"

  );

  const promotions = useQuery(

    api.productPromotions.getActiveForProduct,

    productId ? { productId, now } : "skip"

  );



  const { products: similarProducts, loading: similarLoading, isEmpty: noSimilar } =

    useSimilarProducts(productId);



  const [selectedColor, setSelectedColor] = useState("");

  const [quantity, setQuantity] = useState(1);



  const colorsList = product?.colors;

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

    showSuccess("Added to cart");

  }, [product, inStock, addToCart, activeColor, quantity, showError, showSuccess]);



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

    return <LoadingView message="Loading product…" />;

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

              accessibilityLabel={wishlisted ? "Remove from wishlist" : "Add to wishlist"}

              variant="surface"

              color={wishlisted ? colors.destructive : colors.foreground}

              onPress={() => void toggle(product._id)}

            />

          </View>

        </View>



        <ScrollView showsVerticalScrollIndicator={false} bounces>

          <ProductImageGallery product={product} />



          <View style={styles.content}>

            {product.category?.name ? (

              <Pressable

                onPress={() =>

                  product.category?.slug

                    ? router.push(`/category/${product.category.slug}`)

                    : undefined

                }

              >

                <Text style={styles.category}>{product.category.name}</Text>

              </Pressable>

            ) : null}



            <Text style={styles.name}>{product.name}</Text>

            {product.company ? (

              <Text style={styles.brand}>{product.company}</Text>

            ) : null}



            <RatingStars

              rating={reviewSummary?.averageRating ?? product.stars}

              reviewCount={reviewSummary?.totalReviews ?? product.reviews}

            />



            <View style={styles.priceRow}>

              <PriceDisplay

                price={displayPrice}

                originalPrice={hasDiscount ? product.price : undefined}

                size="lg"

              />

              {hasDiscount ? (

                <Badge label={`-${discountPercent}%`} variant="destructive" />

              ) : null}

            </View>



            <View style={styles.stockRow}>

              <View style={[styles.stockDot, inStock ? styles.inStockDot : styles.outStockDot]} />

              <Text style={[styles.stockText, !inStock && styles.outOfStock]}>

                {inStock ? `${product.stock} in stock` : "Out of stock"}

              </Text>

            </View>



            {promotions && promotions.length > 0 ? (

              <View style={styles.promoSection}>

                {promotions.map((promo) => (

                  <View key={promo._id} style={styles.promoBadge}>

                    <Ionicons name="pricetag" size={14} color={colors.primary} />

                    <Text style={styles.promoText}>{promo.name}</Text>

                  </View>

                ))}

              </View>

            ) : null}



            {colorsList && colorsList.length > 0 ? (

              <View style={styles.optionSection}>

                <Text style={styles.optionLabel}>Color</Text>

                <View style={styles.colorRow}>

                  {colorsList.map((color) => (

                    <Pressable

                      key={color}

                      accessibilityLabel={`Select color ${color}`}

                      onPress={() => setSelectedColor(color)}

                      style={[

                        styles.colorSwatch,

                        { backgroundColor: color },

                        activeColor === resolveProductColorOrDefault(colorsList, color) &&

                          styles.colorSwatchActive,

                      ]}

                    />

                  ))}

                </View>

              </View>

            ) : null}



            {product.description ? (

              <View style={styles.section}>

                <Text style={styles.sectionTitle}>Description</Text>

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

            <HomeSection title="You May Also Like" subtitle="Similar products">

              <ProductCarousel

                products={similarProducts}

                isLoading={similarLoading}

              />

            </HomeSection>

          ) : null}



          <View style={{ height: 100 + insets.bottom }} />

        </ScrollView>



        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>

          <View style={styles.footerQty}>

            <Pressable

              accessibilityLabel="Decrease quantity"

              onPress={() => setQuantity((q) => Math.max(1, q - 1))}

              style={styles.qtyButton}

            >

              <Ionicons name="remove" size={20} color={colors.foreground} />

            </Pressable>

            <Text style={styles.qtyText}>{quantity}</Text>

            <Pressable

              accessibilityLabel="Increase quantity"

              onPress={() => setQuantity((q) => Math.min(product.stock, q + 1))}

              style={styles.qtyButton}

              disabled={quantity >= product.stock}

            >

              <Ionicons name="add" size={20} color={colors.foreground} />

            </Pressable>

          </View>

          <Button

            label="Add to Cart"

            onPress={handleAddToCart}

            disabled={!inStock}

            style={styles.footerCta}

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

  topBar: {

    position: "absolute",

    top: 0,

    left: 0,

    right: 0,

    zIndex: 10,

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    paddingHorizontal: spacing.lg,

  },

  topActions: {

    flexDirection: "row",

    gap: spacing.sm,

  },

  content: {

    padding: spacing.lg,

    gap: spacing.md,

  },

  category: {

    ...textStyles.caption,

    color: colors.primary,

    textTransform: "uppercase",

  },

  name: {

    ...textStyles.display,

    fontSize: 26,

    lineHeight: 32,

  },

  brand: {

    ...textStyles.bodySmall,

    marginTop: -spacing.xs,

  },

  priceRow: {

    flexDirection: "row",

    alignItems: "center",

    gap: spacing.sm,

    flexWrap: "wrap",

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

  promoBadge: {

    flexDirection: "row",

    alignItems: "center",

    gap: spacing.sm,

    backgroundColor: colors.primaryMuted,

    paddingHorizontal: spacing.md,

    paddingVertical: spacing.sm,

    borderRadius: radius.sm,

    alignSelf: "flex-start",

  },

  promoText: {

    ...textStyles.bodySmall,

    color: colors.primary,

    fontWeight: "600",

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

    width: 36,

    height: 36,

    borderRadius: radius.full,

    borderWidth: 2,

    borderColor: colors.border,

  },

  colorSwatchActive: {

    borderColor: colors.primary,

    borderWidth: 3,

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

    flexDirection: "row",

    alignItems: "center",

    gap: spacing.md,

    paddingHorizontal: spacing.lg,

    paddingTop: spacing.md,

    backgroundColor: colors.surface,

    borderTopWidth: StyleSheet.hairlineWidth,

    borderTopColor: colors.border,

    ...shadows.md,

  },

  footerQty: {

    flexDirection: "row",

    alignItems: "center",

    backgroundColor: colors.background,

    borderRadius: radius.md,

    borderWidth: 1,

    borderColor: colors.borderLight,

  },

  qtyButton: {

    width: touchTarget,

    height: touchTarget,

    alignItems: "center",

    justifyContent: "center",

  },

  qtyText: {

    minWidth: 32,

    textAlign: "center",

    fontSize: 16,

    fontWeight: "700",

    color: colors.foreground,

  },

  footerCta: {

    flex: 1,

  },

});



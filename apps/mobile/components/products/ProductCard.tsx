import { formatCurrencyAmount, getPrimaryImageAlt, getPrimaryImageUrl } from "@ecommerce/shared";

import { Ionicons } from "@expo/vector-icons";

import { Image } from "expo-image";

import { router } from "expo-router";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Animated, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";



import { RatingStars } from "@/components/products/RatingStars";

import { AddToCartSheet } from "@/components/cart/AddToCartSheet";

import { PressableScale } from "@/components/ui/PressableScale";

import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { resolveProductCurrency } from "@/lib/product-display";

import {

  animation,

  layout,

  radius,

  spacing,

  typography,

} from "@/constants/theme";

import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";

import { useTheme } from "@/providers/theme-context";

import { useWishlist } from "@/hooks/useWishlist";

import { getFriendlyErrorMessage } from "@/lib/errors";

import { useProductCompareOptional } from "@/providers/compare-context";

import { useToast } from "@/providers/toast-context";

import type { Product } from "@/types/product";

import type { Id } from "@convex/_generated/dataModel";



type ProductCardProps = {

  product: Product;

  variant?: "grid" | "list" | "carousel";

  showActions?: boolean;

  rank?: number;

  width?: number;

  style?: ViewStyle;

  onQuickView?: () => void;

};



function ProductCardComponent({

  product,

  variant = "grid",

  showActions = false,

  rank,

  width,

  style,

  onQuickView,

}: ProductCardProps) {

  const { colors, textStyles } = useTheme();

  const styles = useThemedStyles(createProductCardStyles);

  const { showError, showSuccess } = useToast();

  const { isWishlisted, toggle } = useWishlist();

  const compare = useProductCompareOptional();

  const [imageError, setImageError] = useState(false);

  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const heartScale = useMemo(() => new Animated.Value(1), []);

  const prevWishlisted = useRef(false);



  const imageUrl = getPrimaryImageUrl(product);

  const imageAlt = getPrimaryImageAlt(product);

  const discountPercent = product.discountPercent ?? 0;

  const hasDiscount = discountPercent > 0;

  const displayPrice = hasDiscount

    ? product.price * (1 - discountPercent / 100)

    : product.price;

  const wishlisted = isWishlisted(product._id);

  const comparing = compare?.isComparing(product._id as Id<"products">) ?? false;

  const isCarousel = variant === "carousel";

  const isList = variant === "list";

  const outOfStock = product.stock <= 0;



  useEffect(() => {

    if (prevWishlisted.current !== wishlisted && showActions) {

      Animated.sequence([

        Animated.timing(heartScale, {

          toValue: 1.22,

          duration: animation.durationFast,

          useNativeDriver: true,

        }),

        Animated.timing(heartScale, {

          toValue: 1,

          duration: animation.durationFast,

          useNativeDriver: true,

        }),

      ]).start();

    }

    prevWishlisted.current = wishlisted;

  }, [heartScale, showActions, wishlisted]);



  const handlePress = useCallback(() => {

    router.push(`/product/${product._id}`);

  }, [product._id]);



  const handleAddToCart = useCallback(() => {

    if (outOfStock) {

      showError("Out of stock");

      return;

    }

    setAddSheetOpen(true);

  }, [outOfStock, showError]);



  const handleWishlist = useCallback(() => {

    void (async () => {

      try {

        await toggle(product._id as Id<"products">);

      } catch (error) {

        showError(getFriendlyErrorMessage(error, "Couldn't update wishlist. Please try again."));

      }

    })();

  }, [product._id, showError, toggle]);



  const handleCompare = useCallback(() => {

    if (!compare) return;

    if (comparing) {

      compare.removeProduct(product._id as Id<"products">);

      showSuccess("Removed from compare");

      return;

    }

    compare.addProduct(product);

    showSuccess("Added to compare");

  }, [compare, comparing, product, showSuccess]);



  const handleQuickView = useCallback(() => {

    if (onQuickView) {

      onQuickView();

      return;

    }

    router.push(`/product/${product._id}`);

  }, [onQuickView, product._id]);



  if (isList) {

    return (

      <>

        <PressableScale

          onPress={handlePress}

          style={[styles.listCard, style]}

          accessibilityRole="button"

          accessibilityLabel={`${product.name}, ${formatCurrencyAmount(displayPrice, resolveProductCurrency(product.currency))}${outOfStock ? ", out of stock" : ""}`}

        >

          <View style={styles.listImageWrap}>

            {imageUrl && !imageError ? (

              <Image

                source={{ uri: imageUrl }}

                style={styles.listImage}

                contentFit="cover"

                accessibilityLabel={imageAlt}

                onError={() => setImageError(true)}

              />

            ) : (

              <View style={styles.imagePlaceholder}>

                <Ionicons name="image-outline" size={24} color={colors.muted} />

              </View>

            )}

            {hasDiscount ? (

              <View style={styles.listDiscountBadge}>

                <Text style={styles.discountText}>-{discountPercent}%</Text>

              </View>

            ) : null}

          </View>



          <View style={styles.listContent}>

            <Text style={styles.listName} numberOfLines={2}>

              {product.name}

            </Text>

            {product.stars > 0 ? (

              <RatingStars rating={product.stars} reviewCount={product.reviews} size={11} />

            ) : (

              <Text style={styles.noReviews}>No reviews yet</Text>

            )}

            <PriceDisplay

              price={displayPrice}

              originalPrice={hasDiscount ? product.price : undefined}

              currency={product.currency}

              size="sm"

            />

            {outOfStock ? <Text style={styles.listStock}>Out of stock</Text> : null}

          </View>



          {showActions ? (

            <View style={styles.listActions}>

              <Pressable

                accessibilityRole="button"

                accessibilityLabel={

                  wishlisted ? "Remove product from wishlist" : "Add product to wishlist"

                }

                onPress={(e) => {

                  e.stopPropagation?.();

                  handleWishlist();

                }}

                style={styles.listActionBtn}

              >

                <Animated.View style={{ transform: [{ scale: heartScale }] }}>

                  <Ionicons

                    name={wishlisted ? "heart" : "heart-outline"}

                    size={18}

                    color={wishlisted ? colors.destructive : colors.foreground}

                  />

                </Animated.View>

              </Pressable>

              <Pressable

                accessibilityRole="button"

                accessibilityLabel="Open quick view"

                onPress={(e) => {

                  e.stopPropagation?.();

                  handleQuickView();

                }}

                style={styles.listActionBtn}

              >

                <Ionicons name="expand-outline" size={18} color={colors.foreground} />

              </Pressable>

              <Pressable

                accessibilityRole="button"

                accessibilityLabel={

                  comparing ? "Remove product from compare" : "Add product to compare"

                }

                onPress={(e) => {

                  e.stopPropagation?.();

                  handleCompare();

                }}

                style={[styles.listActionBtn, comparing && styles.listActionBtnActive]}

              >

                <Ionicons

                  name="swap-horizontal-outline"

                  size={18}

                  color={comparing ? colors.cta : colors.foreground}

                />

              </Pressable>

              <Pressable

                accessibilityRole="button"

                accessibilityLabel={outOfStock ? "Out of stock" : "Add to cart"}

                disabled={outOfStock}

                onPress={(e) => {

                  e.stopPropagation?.();

                  handleAddToCart();

                }}

                style={[styles.listActionBtn, outOfStock && styles.listActionBtnDisabled]}

              >

                <Ionicons

                  name={outOfStock ? "ban-outline" : "cart-outline"}

                  size={18}

                  color={outOfStock ? colors.muted : colors.cta}

                />

              </Pressable>

            </View>

          ) : null}

        </PressableScale>



        {showActions ? (

          <AddToCartSheet

            visible={addSheetOpen}

            productId={product._id as Id<"products">}

            fallbackProduct={product}

            onClose={() => setAddSheetOpen(false)}

          />

        ) : null}

      </>

    );

  }



  return (

    <>

      <PressableScale

        onPress={handlePress}

        fill={!isCarousel}

        style={[styles.card, width ? { width } : null, isCarousel && styles.cardCarousel, style]}

        accessibilityRole="button"

        accessibilityLabel={`${product.name}, ${formatCurrencyAmount(displayPrice, resolveProductCurrency(product.currency))}${outOfStock ? ", out of stock" : ""}`}

      >

        <View style={styles.imageWrap}>

          {imageUrl && !imageError ? (

            <Image

              source={{ uri: imageUrl }}

              style={styles.image}

              contentFit="cover"

              contentPosition="center"

              cachePolicy="memory-disk"

              transition={150}

              recyclingKey={product._id}

              accessibilityLabel={imageAlt}

              onError={() => setImageError(true)}

            />

          ) : (

            <View style={styles.imagePlaceholder}>

              <Ionicons name="image-outline" size={24} color={colors.muted} />

            </View>

          )}



          {outOfStock ? (

            <View style={styles.stockOverlay}>

              <Text style={styles.stockOverlayText}>Out of stock</Text>

            </View>

          ) : null}



          {rank ? (

            <View style={styles.rankBadge}>

              <Text style={styles.rankText}>{rank}</Text>

            </View>

          ) : hasDiscount ? (

            <View style={styles.discountBadge}>

              <Text style={styles.discountText}>-{discountPercent}%</Text>

            </View>

          ) : null}



          {rank && hasDiscount ? (

            <View style={styles.discountBadgeSecondary}>

              <Text style={styles.discountText}>-{discountPercent}%</Text>

            </View>

          ) : null}



          {showActions ? (

            <View style={styles.actionStack}>

              <Pressable

                accessibilityRole="button"

                accessibilityLabel={

                  wishlisted ? "Remove product from wishlist" : "Add product to wishlist"

                }

                hitSlop={4}

                onPress={(e) => {

                  e.stopPropagation?.();

                  handleWishlist();

                }}

                style={({ pressed }) => [styles.actionBtn, pressed && styles.wishlistPressed]}

              >

                <Animated.View style={{ transform: [{ scale: heartScale }] }}>

                  <Ionicons

                    name={wishlisted ? "heart" : "heart-outline"}

                    size={16}

                    color={wishlisted ? colors.destructive : colors.foreground}

                  />

                </Animated.View>

              </Pressable>

              <Pressable

                accessibilityRole="button"

                accessibilityLabel="Open quick view"

                hitSlop={4}

                onPress={(e) => {

                  e.stopPropagation?.();

                  handleQuickView();

                }}

                style={({ pressed }) => [styles.actionBtn, pressed && styles.wishlistPressed]}

              >

                <Ionicons name="expand-outline" size={16} color={colors.foreground} />

              </Pressable>

              <Pressable

                accessibilityRole="button"

                accessibilityLabel={

                  comparing ? "Remove product from compare" : "Add product to compare"

                }

                hitSlop={4}

                onPress={(e) => {

                  e.stopPropagation?.();

                  handleCompare();

                }}

                style={({ pressed }) => [

                  styles.actionBtn,

                  comparing && styles.actionBtnActive,

                  pressed && styles.wishlistPressed,

                ]}

              >

                <Ionicons

                  name="swap-horizontal-outline"

                  size={16}

                  color={comparing ? colors.cta : colors.foreground}

                />

              </Pressable>

            </View>

          ) : null}

        </View>



        <View style={[styles.content, isCarousel && styles.contentCarousel]}>

          <View style={styles.details}>

            <Text style={[textStyles.cardTitle, styles.name, isCarousel && styles.nameCarousel]} numberOfLines={2}>

              {product.name}

            </Text>



            <View style={styles.ratingSlot}>

              {product.stars > 0 ? (

                <RatingStars rating={product.stars} reviewCount={product.reviews} size={11} />

              ) : (

                <Text style={styles.noReviews}>No reviews yet</Text>

              )}

            </View>



            <PriceDisplay

              price={displayPrice}

              originalPrice={hasDiscount ? product.price : undefined}

              currency={product.currency}

              size={isCarousel ? "sm" : "md"}

            />

          </View>



          {showActions ? (

            <Pressable

              accessibilityRole="button"

              accessibilityLabel={outOfStock ? "Out of stock" : "Add to cart"}

              disabled={outOfStock}

              onPress={(e) => {

                e.stopPropagation?.();

                handleAddToCart();

              }}

              style={({ pressed }) => [

                styles.addBtn,

                outOfStock && styles.addBtnDisabled,

                pressed && !outOfStock && styles.addBtnPressed,

              ]}

            >

              <Ionicons

                name={outOfStock ? "ban-outline" : "cart-outline"}

                size={16}

                color={outOfStock ? colors.muted : colors.cta}

              />

              <Text style={[styles.addBtnText, outOfStock && styles.addBtnTextDisabled]}>

                {outOfStock ? "Sold out" : "Add to cart"}

              </Text>

            </Pressable>

          ) : null}

        </View>

      </PressableScale>



      {showActions ? (

        <AddToCartSheet

          visible={addSheetOpen}

          productId={product._id as Id<"products">}

          fallbackProduct={product}

          onClose={() => setAddSheetOpen(false)}

        />

      ) : null}

    </>

  );

}



export const ProductCard = memo(ProductCardComponent);



function createProductCardStyles({ colors, textStyles, shadows }: ThemeStyleTokens) {
  return StyleSheet.create({

  card: {

    flex: 1,

    backgroundColor: colors.surface,

    borderRadius: radius.md,

    overflow: "hidden",

    ...shadows.card,

  },

  cardCarousel: {

    flex: undefined,

  },

  listCard: {

    flexDirection: "row",

    alignItems: "center",

    gap: spacing.md,

    backgroundColor: colors.surface,

    borderRadius: radius.md,

    padding: spacing.sm,

    marginBottom: spacing.md,

    ...shadows.card,

  },

  listImageWrap: {

    width: 96,

    height: 96,

    borderRadius: radius.sm,

    overflow: "hidden",

    backgroundColor: colors.borderLight,

    position: "relative",

  },

  listImage: {

    width: "100%",

    height: "100%",

  },

  listDiscountBadge: {

    position: "absolute",

    top: spacing.xs,

    left: spacing.xs,

    backgroundColor: colors.discountMuted,

    paddingHorizontal: spacing.xs,

    paddingVertical: 2,

    borderRadius: radius.xs,

  },

  listContent: {

    flex: 1,

    gap: spacing.xs,

    minWidth: 0,

  },

  listName: {

    ...textStyles.cardTitle,

    fontSize: typography.sm,

  },

  listStock: {

    fontSize: typography.xs,

    color: colors.muted,

    fontWeight: "600",

  },

  listActions: {

    gap: spacing.xs,

  },

  listActionBtn: {

    width: 40,

    height: 40,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: radius.full,

    backgroundColor: colors.background,

    borderWidth: 1,

    borderColor: colors.border,

  },

  listActionBtnActive: {

    borderColor: colors.selected,

    backgroundColor: colors.selectedMuted,

  },

  listActionBtnDisabled: {

    opacity: 0.6,

  },

  imageWrap: {

    width: "100%",

    aspectRatio: layout.productImageAspect,

    backgroundColor: colors.borderLight,

    position: "relative",

    overflow: "hidden",

  },

  image: {

    ...StyleSheet.absoluteFillObject,

  },

  imagePlaceholder: {

    ...StyleSheet.absoluteFillObject,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: colors.borderLight,

  },

  stockOverlay: {

    ...StyleSheet.absoluteFillObject,

    backgroundColor: "rgba(255,255,255,0.62)",

    alignItems: "center",

    justifyContent: "center",

  },

  stockOverlayText: {

    ...textStyles.badge,

    color: colors.foreground,

    backgroundColor: colors.surface,

    paddingHorizontal: spacing.sm,

    paddingVertical: 2,

    borderRadius: radius.xs,

    overflow: "hidden",

  },

  rankBadge: {

    position: "absolute",

    top: spacing.sm,

    left: spacing.sm,

    minWidth: 28,

    height: 28,

    borderRadius: radius.full,

    backgroundColor: colors.navy,

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 6,

  },

  rankText: {

    fontSize: typography.xs,

    fontWeight: "800",

    color: colors.primaryForeground,

  },

  discountBadge: {

    position: "absolute",

    top: spacing.sm,

    left: spacing.sm,

    backgroundColor: colors.discountMuted,

    paddingHorizontal: spacing.sm,

    paddingVertical: 2,

    borderRadius: radius.xs,

  },

  discountBadgeSecondary: {

    position: "absolute",

    bottom: spacing.sm,

    left: spacing.sm,

    backgroundColor: colors.discountMuted,

    paddingHorizontal: spacing.sm,

    paddingVertical: 2,

    borderRadius: radius.xs,

  },

  discountText: {

    ...textStyles.badge,

    color: colors.discount,

  },

  actionStack: {

    position: "absolute",

    top: spacing.xs,

    right: spacing.xs,

    gap: spacing.xs,

  },

  actionBtn: {

    width: 34,

    height: 34,

    borderRadius: radius.full,

    backgroundColor: colors.surface,

    alignItems: "center",

    justifyContent: "center",

    ...shadows.sm,

  },

  actionBtnActive: {

    borderWidth: 1,

    borderColor: colors.selected,

  },

  wishlistPressed: {

    opacity: 0.88,

  },

  content: {

    flex: 1,

    padding: spacing.md,

    gap: spacing.sm,

    justifyContent: "space-between",

  },

  contentCarousel: {

    padding: spacing.sm + 2,

  },

  details: {

    gap: spacing.xs,

    minHeight: 72,

  },

  name: {

    minHeight: 36,

  },

  nameCarousel: {

    fontSize: typography.sm,

    lineHeight: 17,

    minHeight: 34,

  },

  ratingSlot: {

    minHeight: 16,

    justifyContent: "center",

  },

  noReviews: {

    fontSize: typography.xs,

    color: colors.muted,

  },

  addBtn: {

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 6,

    minHeight: 40,

    paddingHorizontal: spacing.sm,

    backgroundColor: colors.surface,

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: radius.sm,

  },

  addBtnPrimary: {

    backgroundColor: colors.cta,

    borderColor: colors.cta,

  },

  addBtnDisabled: {

    backgroundColor: colors.borderLight,

    borderColor: colors.border,

  },

  addBtnPressed: {

    backgroundColor: colors.ctaMuted,

  },

  addBtnText: {

    fontSize: typography.sm,

    fontWeight: "600",

    color: colors.foreground,

  },

  addBtnTextPrimary: {

    color: colors.ctaForeground,

  },

  addBtnTextDisabled: {

    color: colors.muted,

  },

  });
}


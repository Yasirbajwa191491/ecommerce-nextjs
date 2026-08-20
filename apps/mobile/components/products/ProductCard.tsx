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
import {
  animation,
  colors,
  layout,
  radius,
  shadows,
  sizes,
  spacing,
  textStyles,
  typography,
} from "@/constants/theme";
import { useWishlist } from "@/hooks/useWishlist";
import { useToast } from "@/providers/toast-context";
import type { Product } from "@/types/product";
import type { Id } from "@convex/_generated/dataModel";

type ProductCardProps = {
  product: Product;
  variant?: "grid" | "carousel";
  showActions?: boolean;
  rank?: number;
  width?: number;
  style?: ViewStyle;
};

function ProductCardComponent({
  product,
  variant = "grid",
  showActions = false,
  rank,
  width,
  style,
}: ProductCardProps) {
  const { showError } = useToast();
  const { isWishlisted, toggle } = useWishlist();
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
  const isCarousel = variant === "carousel";
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
    void toggle(product._id as Id<"products">);
  }, [product._id, toggle]);

  return (
    <>
      <PressableScale
        onPress={handlePress}
        style={[styles.card, width ? { width } : null, isCarousel && styles.cardCarousel, style]}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${formatCurrencyAmount(displayPrice)}${outOfStock ? ", out of stock" : ""}`}
      >
        <View style={styles.imageWrap}>
          {imageUrl && !imageError ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="cover"
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              hitSlop={4}
              onPress={(e) => {
                e.stopPropagation?.();
                handleWishlist();
              }}
              style={({ pressed }) => [styles.wishlistBtn, pressed && styles.wishlistPressed]}
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons
                  name={wishlisted ? "heart" : "heart-outline"}
                  size={18}
                  color={wishlisted ? colors.destructive : colors.foreground}
                />
              </Animated.View>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.content, isCarousel && styles.contentCarousel]}>
          <Text style={[textStyles.cardTitle, isCarousel && styles.nameCarousel]} numberOfLines={2}>
            {product.name}
          </Text>

          {product.stars > 0 ? (
            <RatingStars rating={product.stars} reviewCount={product.reviews} size={11} />
          ) : null}

          <PriceDisplay
            price={displayPrice}
            originalPrice={hasDiscount ? product.price : undefined}
            size={isCarousel ? "sm" : "md"}
          />

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
                name="add"
                size={16}
                color={outOfStock ? colors.muted : colors.primaryForeground}
              />
              <Text style={[styles.addBtnText, outOfStock && styles.addBtnTextDisabled]}>
                {outOfStock ? "Sold out" : "Add"}
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

const styles = StyleSheet.create({
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
  imageWrap: {
    aspectRatio: layout.productImageAspect,
    backgroundColor: colors.borderLight,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
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
  wishlistBtn: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    width: sizes.qtyControl,
    height: sizes.qtyControl,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  wishlistPressed: {
    opacity: 0.88,
  },
  content: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  contentCarousel: {
    padding: spacing.sm + 2,
  },
  nameCarousel: {
    fontSize: typography.sm,
    lineHeight: 17,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    minHeight: sizes.buttonMd,
  },
  addBtnDisabled: {
    backgroundColor: colors.borderLight,
  },
  addBtnPressed: {
    opacity: 0.9,
  },
  addBtnText: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.primaryForeground,
  },
  addBtnTextDisabled: {
    color: colors.muted,
  },
});

import { getPrimaryImageAlt, getPrimaryImageUrl } from "@ecommerce/shared";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { RatingStars } from "@/components/products/RatingStars";
import { PressableScale } from "@/components/ui/PressableScale";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import {
  animation,
  colors,
  layout,
  radius,
  shadows,
  spacing,
  textStyles,
  touchTarget,
  typography,
} from "@/constants/theme";
import { resolveProductColorOrDefault } from "@/lib/cart-lines";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/providers/cart-context";
import { useToast } from "@/providers/toast-context";
import type { Product } from "@/types/product";
import type { Id } from "@convex/_generated/dataModel";

type ProductCardProps = {
  product: Product;
  variant?: "grid" | "carousel";
  showActions?: boolean;
  width?: number;
  style?: ViewStyle;
};

function ProductCardComponent({
  product,
  variant = "grid",
  showActions = false,
  width,
  style,
}: ProductCardProps) {
  const { addToCart } = useCart();
  const { showError, showSuccess } = useToast();
  const { isWishlisted, toggle } = useWishlist();
  const [imageError, setImageError] = useState(false);
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
    if (product.stock <= 0) {
      showError("Out of stock");
      return;
    }
    addToCart(
      product,
      resolveProductColorOrDefault(product.colors ?? [], product.colors?.[0] ?? "#000000"),
      1
    );
    showSuccess("Added to cart");
  }, [addToCart, product, showError, showSuccess]);

  const handleWishlist = useCallback(() => {
    void toggle(product._id as Id<"products">);
  }, [product._id, toggle]);

  return (
    <PressableScale
      onPress={handlePress}
      style={[styles.card, width ? { width } : null, isCarousel && styles.cardCarousel, style]}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${displayPrice}`}
    >
      <View style={styles.imageWrap}>
        {imageUrl && !imageError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            accessibilityLabel={imageAlt}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={24} color={colors.muted} />
          </View>
        )}

        {hasDiscount ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPercent}%</Text>
          </View>
        ) : null}

        {showActions ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation?.();
              handleWishlist();
            }}
            style={({ pressed }) => [styles.wishlistBtn, pressed && styles.wishlistPressed]}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={wishlisted ? "heart" : "heart-outline"}
                size={17}
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
            accessibilityLabel="Add to cart"
            onPress={(e) => {
              e.stopPropagation?.();
              handleAddToCart();
            }}
            style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          >
            <Ionicons name="add" size={16} color={colors.primaryForeground} />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        ) : null}
      </View>
    </PressableScale>
  );
}

export const ProductCard = memo(ProductCardComponent);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
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
  discountBadge: {
    position: "absolute",
    top: spacing.sm,
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
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
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
    gap: 3,
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    minHeight: touchTarget - 4,
    paddingVertical: spacing.sm - 1,
  },
  addBtnPressed: {
    opacity: 0.9,
  },
  addBtnText: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.primaryForeground,
  },
});

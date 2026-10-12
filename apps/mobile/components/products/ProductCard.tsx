import { formatCurrencyAmount, getPrimaryImageAlt, getPrimaryImageUrl } from "@ecommerce/shared";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { memo, useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddToCartSheet } from "@/components/cart/AddToCartSheet";
import { ProductQuickViewSheet } from "@/components/products/ProductQuickViewSheet";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useWishlist } from "@/hooks/useWishlist";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { resolveProductCurrency } from "@/lib/product-display";
import { useProductCompareOptional } from "@/providers/compare-context";
import { useTheme } from "@/providers/theme-context";
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

function ProductCardComponent({ product, variant = "grid", showActions = false, width, style, onQuickView }: ProductCardProps) {
  const { colors, reduceMotion } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { showError, showSuccess } = useToast();
  const { isWishlisted, toggle } = useWishlist();
  const compare = useProductCompareOptional();
  const [imageError, setImageError] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const imageUrl = getPrimaryImageUrl(product);
  const discountPercent = product.discountPercent ?? 0;
  const displayPrice = product.price * (1 - Math.max(0, Math.min(100, discountPercent)) / 100);
  const wishlisted = isWishlisted(product._id);
  const comparing = compare?.isComparing(product._id as Id<"products">) ?? false;
  const outOfStock = product.stock <= 0;
  const isList = variant === "list";
  const productLabel = `${product.name}, ${formatCurrencyAmount(displayPrice, resolveProductCurrency(product.currency))}${outOfStock ? ", out of stock" : ""}`;

  const handleWishlist = useCallback(async () => {
    if (wishlistBusy) return;
    setWishlistBusy(true);
    try {
      await toggle(product._id as Id<"products">);
    } catch (error) {
      showError(getFriendlyErrorMessage(error, "Couldn't update wishlist. Please try again."));
    } finally {
      setWishlistBusy(false);
    }
  }, [product._id, showError, toggle, wishlistBusy]);

  const handleCompare = () => {
    setMenuOpen(false);
    if (!compare) return;
    if (comparing) {
      compare.removeProduct(product._id as Id<"products">);
      showSuccess("Removed from compare");
    } else {
      compare.addProduct(product);
      showSuccess("Added to compare");
    }
  };

  const image = (
    <View style={[styles.imageWrap, isList && styles.listImageWrap]}>
      {imageUrl && !imageError ? (
        <Image source={{ uri: imageUrl }} style={styles.image} contentFit="contain" cachePolicy="memory-disk" transition={reduceMotion ? 0 : 120} recyclingKey={product._id} accessibilityLabel={getPrimaryImageAlt(product)} onError={() => setImageError(true)} />
      ) : <Ionicons name="image-outline" size={30} color={colors.textSecondary} />}
      {discountPercent > 0 ? (
        <View style={styles.discountBadge}><Text style={styles.discountText}>{discountPercent}% off</Text></View>
      ) : null}
    </View>
  );

  return (
    <>
      <View style={[styles.card, variant === "carousel" && styles.carouselCard, width ? { width } : null, style]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`View ${productLabel}`} onPress={() => router.push(`/product/${product._id}`)} style={({ pressed }) => [styles.productLink, isList && styles.listLink, pressed && styles.pressed]}>
          {image}
          <View style={[styles.details, isList && styles.listDetails]}>
            <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
            <PriceDisplay price={displayPrice} originalPrice={discountPercent > 0 ? product.price : undefined} currency={product.currency} size="sm" />
            <View style={styles.rating}>
              {product.reviews > 0 ? (
                <><Ionicons name="star" size={13} color={colors.warning} /><Text style={styles.ratingText}>{product.stars.toFixed(1)} ({product.reviews.toLocaleString()})</Text></>
              ) : <Text style={styles.ratingText}>No reviews yet</Text>}
              {outOfStock ? <Text style={styles.stockText}>Sold out</Text> : null}
            </View>
          </View>
        </Pressable>
        {showActions ? (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel={`${wishlisted ? "Remove" : "Save"} ${product.name} ${wishlisted ? "from" : "to"} wishlist`} accessibilityState={{ selected: wishlisted, busy: wishlistBusy, disabled: wishlistBusy }} disabled={wishlistBusy} onPress={() => void handleWishlist()} style={({ pressed }) => [styles.wishlist, pressed && styles.pressed]}>
              <Ionicons name={wishlisted ? "heart" : "heart-outline"} size={21} color={wishlisted ? colors.destructive : colors.foreground} />
            </Pressable>
            <View style={styles.actions}>
              <Button label={outOfStock ? "Sold out" : "Add"} size="sm" variant="secondary" disabled={outOfStock} accessibilityLabel={outOfStock ? `${product.name} is sold out` : `Add ${product.name} to cart`} onPress={() => setAddSheetOpen(true)} style={styles.addButton} />
              <IconButton icon="ellipsis-horizontal" accessibilityLabel={`More options for ${product.name}`} onPress={() => setMenuOpen(true)} />
            </View>
          </>
        ) : null}
      </View>
      {menuOpen ? (
        <Modal transparent visible animationType={reduceMotion ? "none" : "fade"} onRequestClose={() => setMenuOpen(false)}>
          <View style={styles.menuOverlay}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close product options" style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
            <View accessibilityViewIsModal style={[styles.menu, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
              <View style={styles.menuHeader}><Text style={styles.menuTitle} numberOfLines={2}>{product.name}</Text><IconButton icon="close" accessibilityLabel="Close product options" onPress={() => setMenuOpen(false)} /></View>
              <Pressable accessibilityRole="button" onPress={() => { setMenuOpen(false); if (onQuickView) onQuickView(); else setQuickViewOpen(true); }} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
                <Ionicons name="expand-outline" size={21} color={colors.foreground} /><Text style={styles.menuLabel}>Quick view</Text><Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
              {compare ? (
                <Pressable accessibilityRole="button" onPress={handleCompare} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
                  <Ionicons name="swap-horizontal-outline" size={21} color={colors.foreground} /><Text style={styles.menuLabel}>{comparing ? "Remove from comparison" : "Compare product"}</Text><Ionicons name={comparing ? "checkmark-circle" : "add-circle-outline"} size={21} color={colors.foreground} />
                </Pressable>
              ) : null}
            </View>
          </View>
        </Modal>
      ) : null}
      {addSheetOpen ? <AddToCartSheet visible productId={product._id as Id<"products">} fallbackProduct={product} onClose={() => setAddSheetOpen(false)} /> : null}
      {quickViewOpen ? <ProductQuickViewSheet visible productId={product._id as Id<"products">} fallbackProduct={product} onClose={() => setQuickViewOpen(false)} /> : null}
    </>
  );
}

export const ProductCard = memo(ProductCardComponent);

function createStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    card: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
    carouselCard: { flex: undefined },
    productLink: { flex: 1 },
    listLink: { flexDirection: "row", padding: spacing.md, gap: spacing.md, alignItems: "center" },
    imageWrap: { width: "100%", aspectRatio: 1, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", position: "relative" },
    listImageWrap: { width: 108, height: 120, borderRadius: radius.sm },
    image: { width: "100%", height: "100%" },
    discountBadge: { position: "absolute", left: spacing.sm, bottom: spacing.sm, backgroundColor: colors.discountMuted, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.xs },
    discountText: { fontSize: typography.xs, fontWeight: "600", color: colors.discount },
    details: { padding: spacing.md, gap: spacing.sm },
    listDetails: { flex: 1, minWidth: 0, padding: 0 },
    name: { ...textStyles.cardTitle, fontSize: typography.base, lineHeight: 21, minHeight: 42 },
    rating: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.xs, minHeight: 20 },
    ratingText: { fontSize: typography.sm, color: colors.textSecondary },
    stockText: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: "600" },
    wishlist: { position: "absolute", top: spacing.xs, right: spacing.xs, width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
    actions: { flexDirection: "row", gap: spacing.xs, alignItems: "center", paddingHorizontal: spacing.md, paddingBottom: spacing.md },
    addButton: { flex: 1, minWidth: 0 },
    pressed: { opacity: 0.78 },
    menuOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay },
    menu: { width: "100%", maxWidth: 560, alignSelf: "center", padding: spacing.lg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.surface },
    menuHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
    menuTitle: { ...textStyles.sectionTitle, flex: 1 },
    menuRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 56, paddingVertical: spacing.md },
    menuLabel: { ...textStyles.body, flex: 1 },
  });
}

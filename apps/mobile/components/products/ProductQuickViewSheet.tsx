import { getPrimaryImageAlt, getPrimaryImageUrl } from "@ecommerce/shared";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddToCartSheet } from "@/components/cart/AddToCartSheet";
import { RatingStars } from "@/components/products/RatingStars";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { colors, layout, radius, shadows, spacing, textStyles, typography } from "@/constants/theme";
import { useWishlist } from "@/hooks/useWishlist";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { api } from "@/lib/convex-api";
import { useToast } from "@/providers/toast-context";
import type { Product } from "@/types/product";
import type { Id } from "@convex/_generated/dataModel";

type ProductQuickViewSheetProps = {
  productId: Id<"products"> | null;
  fallbackProduct?: Product | null;
  visible: boolean;
  onClose: () => void;
};

export function ProductQuickViewSheet({
  productId,
  fallbackProduct,
  visible,
  onClose,
}: ProductQuickViewSheetProps) {
  const insets = useSafeAreaInsets();
  const { showError } = useToast();
  const { isWishlisted, toggle } = useWishlist();
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const fetchedProduct = useQuery(
    api.products.getById,
    visible && productId ? { id: productId } : "skip"
  );

  const product = fetchedProduct ?? fallbackProduct ?? null;
  const isLoading = visible && productId != null && fetchedProduct === undefined && !fallbackProduct;
  const wishlisted = product ? isWishlisted(product._id as Id<"products">) : false;
  const outOfStock = (product?.stock ?? 0) <= 0;

  const imageUrl = product ? getPrimaryImageUrl(product) : "";
  const imageAlt = product ? getPrimaryImageAlt(product) : "";
  const discountPercent = product?.discountPercent ?? 0;
  const displayPrice = useMemo(() => {
    if (!product) return 0;
    return discountPercent > 0
      ? product.price * (1 - discountPercent / 100)
      : product.price;
  }, [discountPercent, product]);

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>Quick view</Text>
              <IconButton
                icon="close"
                accessibilityLabel="Close quick view"
                onPress={onClose}
              />
            </View>

            {isLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : product ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.imageWrap}>
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.image}
                      contentFit="cover"
                      accessibilityLabel={imageAlt}
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={32} color={colors.muted} />
                    </View>
                  )}
                </View>

                <View style={styles.content}>
                  <Text style={styles.company}>{product.company}</Text>
                  <Text style={styles.name}>{product.name}</Text>
                  {product.stars > 0 ? (
                    <RatingStars rating={product.stars} reviewCount={product.reviews} size={14} />
                  ) : (
                    <Text style={styles.noReviews}>No reviews yet</Text>
                  )}
                  <PriceDisplay
                    price={displayPrice}
                    originalPrice={discountPercent > 0 ? product.price : undefined}
                    currency={product.currency}
                  />
                  <Text style={styles.stock}>
                    {outOfStock ? "Out of stock" : "In stock"}
                  </Text>
                  {product.description ? (
                    <Text style={styles.description} numberOfLines={4}>
                      {product.description}
                    </Text>
                  ) : null}

                  <View style={styles.actions}>
                    <Button
                      label={outOfStock ? "Out of stock" : "Add to cart"}
                      disabled={outOfStock}
                      onPress={() => setAddSheetOpen(true)}
                      style={styles.actionBtn}
                    />
                    <IconButton
                      icon={wishlisted ? "heart" : "heart-outline"}
                      accessibilityLabel={
                        wishlisted ? "Remove from wishlist" : "Add to wishlist"
                      }
                      onPress={() => {
                        void (async () => {
                          try {
                            await toggle(product._id as Id<"products">);
                          } catch (error) {
                            showError(
                              getFriendlyErrorMessage(
                                error,
                                "Couldn't update wishlist."
                              )
                            );
                          }
                        })();
                      }}
                    />
                    <Button
                      label="View product"
                      variant="outline"
                      onPress={() => {
                        onClose();
                        router.push(`/product/${product._id}`);
                      }}
                      style={styles.actionBtn}
                    />
                  </View>
                </View>
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {product ? (
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    maxHeight: "88%",
    ...shadows.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: {
    ...textStyles.screenTitle,
    fontSize: 20,
  },
  loadingWrap: {
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  imageWrap: {
    width: "100%",
    aspectRatio: layout.productImageAspect,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  company: {
    fontSize: typography.xs,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  name: {
    ...textStyles.cardTitle,
    fontSize: 18,
  },
  noReviews: {
    fontSize: typography.sm,
    color: colors.muted,
  },
  stock: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  description: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
});

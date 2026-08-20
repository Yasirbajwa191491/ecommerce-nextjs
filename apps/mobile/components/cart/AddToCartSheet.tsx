import { getPrimaryImageUrl } from "@ecommerce/shared";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
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

import { isHexColor } from "@/components/cart/ColorSwatch";
import { Button } from "@/components/ui/Button";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { colors, radius, spacing, textStyles, touchTarget, typography } from "@/constants/theme";
import { resolveProductColorOrDefault } from "@/lib/cart-lines";
import { api } from "@/lib/convex-api";
import { useCart } from "@/providers/cart-context";
import { useToast } from "@/providers/toast-context";
import type { Product } from "@/types/product";
import type { Id } from "@convex/_generated/dataModel";

type AddToCartSheetProps = {
  visible: boolean;
  productId: Id<"products"> | null;
  fallbackProduct?: Product | null;
  onClose: () => void;
};

export function AddToCartSheet({
  visible,
  productId,
  fallbackProduct,
  onClose,
}: AddToCartSheetProps) {
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const { showError, showSuccess } = useToast();

  const fetchedProduct = useQuery(
    api.products.getById,
    visible && productId ? { id: productId } : "skip"
  );

  const product = fetchedProduct ?? fallbackProduct ?? null;
  const isLoading = visible && productId != null && fetchedProduct === undefined;

  const colorsList = product?.colors ?? [];
  const hasColors = colorsList.length > 0;

  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!visible || !product) return;
    setSelectedColor(
      resolveProductColorOrDefault(product.colors ?? [], product.colors?.[0] ?? "#000000")
    );
    setQuantity(1);
  }, [visible, product]);

  const activeColor = useMemo(
    () =>
      product
        ? resolveProductColorOrDefault(colorsList, selectedColor || colorsList[0] || "#000000")
        : "",
    [product, colorsList, selectedColor]
  );

  const discountPercent = product?.discountPercent ?? 0;
  const displayPrice = product
    ? discountPercent > 0
      ? product.price * (1 - discountPercent / 100)
      : product.price
    : 0;

  const inStock = (product?.stock ?? 0) > 0;

  const handleAdd = () => {
    if (!product || !inStock) {
      showError("Out of stock");
      return;
    }

    addToCart(product, activeColor, quantity);
    showSuccess(`Added ${quantity} to cart`);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.handle} />

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading options…</Text>
            </View>
          ) : !product ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>Product unavailable</Text>
              <Button label="Close" variant="outline" onPress={onClose} />
            </View>
          ) : (
            <>
              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
              >
                <View style={styles.header}>
                  <View style={styles.thumbWrap}>
                    {getPrimaryImageUrl(product) ? (
                      <Image
                        source={{ uri: getPrimaryImageUrl(product)! }}
                        style={styles.thumb}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.thumbPlaceholder}>
                        <Ionicons name="image-outline" size={20} color={colors.muted} />
                      </View>
                    )}
                  </View>
                  <View style={styles.headerText}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <PriceDisplay
                      price={displayPrice}
                      originalPrice={discountPercent > 0 ? product.price : undefined}
                      size="md"
                    />
                    <Text style={[styles.stockText, !inStock && styles.outOfStock]}>
                      {inStock ? `${product.stock} available` : "Out of stock"}
                    </Text>
                  </View>
                </View>

                {hasColors ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Color</Text>
                    <View style={styles.colorRow}>
                      {colorsList.map((color) => {
                        const resolved = resolveProductColorOrDefault(colorsList, color);
                        const selected = activeColor === resolved;
                        const hex = isHexColor(color);
                        return (
                          <Pressable
                            key={color}
                            accessibilityRole="button"
                            accessibilityLabel={`Select color ${color}`}
                            accessibilityState={{ selected }}
                            onPress={() => setSelectedColor(color)}
                            style={[
                              hex ? styles.colorOption : styles.namedColorOption,
                              hex ? { backgroundColor: color } : null,
                              selected && styles.colorOptionSelected,
                            ]}
                          >
                            {!hex ? (
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

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Quantity</Text>
                  <View style={styles.quantityRow}>
                    <Pressable
                      accessibilityLabel="Decrease quantity"
                      onPress={() => setQuantity((value) => Math.max(1, value - 1))}
                      style={styles.qtyButton}
                    >
                      <Ionicons name="remove" size={20} color={colors.foreground} />
                    </Pressable>
                    <Text style={styles.qtyText}>{quantity}</Text>
                    <Pressable
                      accessibilityLabel="Increase quantity"
                      onPress={() => setQuantity((value) => Math.min(product.stock, value + 1))}
                      style={styles.qtyButton}
                      disabled={quantity >= product.stock}
                    >
                      <Ionicons
                        name="add"
                        size={20}
                        color={quantity >= product.stock ? colors.muted : colors.foreground}
                      />
                    </Pressable>
                  </View>
                </View>
              </ScrollView>

              <Button
                label="Add to cart"
                size="lg"
                fullWidth
                disabled={!inStock}
                onPress={handleAdd}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    maxHeight: "78%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  loadingWrap: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing["2xl"],
  },
  loadingText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  thumbWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.borderLight,
    flexShrink: 0,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  productName: {
    ...textStyles.cardTitle,
    fontSize: typography.base,
  },
  stockText: {
    fontSize: typography.sm,
    color: colors.success,
    fontWeight: "600",
  },
  outOfStock: {
    color: colors.destructive,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...textStyles.sectionTitle,
    fontSize: typography.sm,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
  },
  colorOptionSelected: {
    borderColor: colors.primary,
    borderWidth: 3,
  },
  namedColorOption: {
    minWidth: 36,
    height: 36,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.borderLight,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  namedColorText: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.foreground,
    textTransform: "capitalize",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
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
    minWidth: 40,
    textAlign: "center",
    fontSize: typography.base,
    fontWeight: "700",
    color: colors.foreground,
  },
});

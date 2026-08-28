import { formatCurrencyAmount } from "@ecommerce/shared";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RatingStars } from "@/components/products/RatingStars";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";
import type { CompareProductSummary } from "@/lib/compare-storage";
import { useProductCompare } from "@/providers/compare-context";

function pickBestLabels(products: CompareProductSummary[]) {
  if (products.length < 2) return null;
  const lowest = [...products].sort((a, b) => a.finalPrice - b.finalPrice)[0];
  const highestRated = [...products].sort(
    (a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount
  )[0];
  return { lowest, highestRated };
}

export function ProductCompareSheet() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createProductCompareSheetStyles);
  const insets = useSafeAreaInsets();
  const { products, sheetOpen, setSheetOpen, removeProduct, clearCompare } =
    useProductCompare();

  if (!products.length) return null;

  const picks = pickBestLabels(products);

  return (
    <Modal
      visible={sheetOpen}
      animationType="slide"
      transparent
      onRequestClose={() => setSheetOpen(false)}
    >
      <Pressable style={styles.overlay} onPress={() => setSheetOpen(false)}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Compare products</Text>
              <Text style={styles.subtitle}>Side-by-side comparison</Text>
            </View>
            <IconButton
              icon="close"
              accessibilityLabel="Close compare sheet"
              onPress={() => setSheetOpen(false)}
            />
          </View>

          {picks ? (
            <View style={styles.badges}>
              <Badge label={`Best value: ${picks.lowest.name}`} variant="primary" />
              {picks.highestRated.id !== picks.lowest.id ? (
                <Badge label={`Best rated: ${picks.highestRated.name}`} />
              ) : null}
            </View>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.table}>
              <View style={styles.row}>
                <View style={styles.labelCell} />
                {products.map((product) => (
                  <View key={product.id} style={styles.productCell}>
                    {product.imageUrl ? (
                      <Image
                        source={{ uri: product.imageUrl }}
                        style={styles.thumb}
                        contentFit="cover"
                      />
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setSheetOpen(false);
                        router.push(`/product/${product.id}`);
                      }}
                    >
                      <Text style={styles.productName}>{product.name}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${product.name} from compare`}
                      onPress={() => removeProduct(product.id)}
                      style={styles.removeBtn}
                    >
                      <Ionicons name="close-circle" size={18} color={colors.muted} />
                    </Pressable>
                  </View>
                ))}
              </View>

              {(
                [
                  {
                    label: "Brand",
                    render: (p: CompareProductSummary) => p.company,
                  },
                  {
                    label: "Price",
                    render: (p: CompareProductSummary) =>
                      formatCurrencyAmount(p.finalPrice, p.currency),
                  },
                  {
                    label: "Rating",
                    render: (p: CompareProductSummary) => (
                      <RatingStars rating={p.rating} reviewCount={p.reviewsCount} size={11} />
                    ),
                  },
                  {
                    label: "Availability",
                    render: (p: CompareProductSummary) => (
                      <Text style={styles.availability}>
                        {p.inStock ? "In stock" : "Out of stock"}
                      </Text>
                    ),
                  },
                ] as const
              ).map((row) => (
                <View key={row.label} style={styles.row}>
                  <View style={styles.labelCell}>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                  </View>
                  {products.map((product) => (
                    <View key={`${row.label}-${product.id}`} style={styles.valueCell}>
                      {typeof row.render(product) === "string" ? (
                        <Text style={styles.valueText}>{row.render(product) as string}</Text>
                      ) : (
                        row.render(product)
                      )}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>

          <Button label="Clear compare" variant="outline" onPress={clearCompare} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createProductCompareSheetStyles({ colors, textStyles, shadows }: ThemeStyleTokens) {
  return StyleSheet.create({
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
    maxHeight: "85%",
    gap: spacing.md,
    ...shadows.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    ...textStyles.screenTitle,
    color: colors.foreground,
    fontSize: 20,
  },
  subtitle: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  table: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  labelCell: {
    width: 88,
    paddingRight: spacing.sm,
  },
  rowLabel: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  productCell: {
    width: 140,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  thumb: {
    width: "100%",
    height: 80,
    borderRadius: radius.sm,
    backgroundColor: colors.borderLight,
  },
  productName: {
    fontSize: typography.sm,
    fontWeight: "700",
    color: colors.primary,
  },
  removeBtn: {
    alignSelf: "flex-start",
  },
  valueCell: {
    width: 140,
    paddingHorizontal: spacing.sm,
    justifyContent: "center",
  },
  valueText: {
    fontSize: typography.sm,
    color: colors.foreground,
  },
  availability: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  });
}


import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { FunctionReturnType } from "convex/server";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { RatingStars } from "@/components/products/RatingStars";
import {
  createTextStyles,
  radius,
  shadows,
  spacing,
  typography,
  type ColorPalette,
} from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";
import {
  clearAllCatalogFilters,
  togglePromotionSlug,
  toggleSlugList,
  type CatalogFilterState,
  type CatalogSort,
  type PromotionFilterSlug,
} from "@/lib/catalog/filters";
import { api } from "@/lib/convex-api";
import type { HomeCategory } from "@/lib/offline/types";
import type { Id } from "@convex/_generated/dataModel";

export type CatalogFacets = FunctionReturnType<typeof api.products.getPublicFilterFacets>;

export const SORT_OPTIONS: { label: string; value: CatalogSort }[] = [
  { label: "Recommended", value: "default" },
  { label: "Popular", value: "popular" },
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "lowest" },
  { label: "Price: High to Low", value: "highest" },
  { label: "Top Rated", value: "rating" },
  { label: "A–Z", value: "a-z" },
  { label: "Z–A", value: "z-a" },
];

type CatalogFiltersSheetProps = {
  visible: boolean;
  onClose: () => void;
  filters: CatalogFilterState;
  onApply: (filters: CatalogFilterState) => void;
  priceBounds?: { minPrice: number; maxPrice: number };
  facets?: CatalogFacets;
  categories?: HomeCategory[];
  showCategorySection?: boolean;
  fixedCategoryId?: Id<"productCategories">;
};

function ColorSwatch({ hex, name }: { hex?: string; name: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: radius.full,
          backgroundColor: hex ?? colors.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        }}
      />
      <Text style={{ fontSize: typography.sm, color: colors.foreground }}>{name}</Text>
    </View>
  );
}

export function CatalogFiltersSheet({
  visible,
  onClose,
  filters,
  onApply,
  priceBounds,
  facets,
  categories = [],
  showCategorySection = true,
  fixedCategoryId,
}: CatalogFiltersSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors, textStyles } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, textStyles),
    [colors, textStyles]
  );
  const [local, setLocal] = useState(filters);

  const handleReset = () => {
    setLocal(
      clearAllCatalogFilters(filters, {
        preserveSearch: true,
        preserveCategoryId: Boolean(fixedCategoryId),
      })
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      onShow={() => setLocal(filters)}
    >
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close filters">
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Filters</Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {showCategorySection && !fixedCategoryId ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Category</Text>
                <View style={styles.chipRow}>
                  <Chip
                    label="All"
                    selected={!local.categoryId}
                    onPress={() => setLocal((prev) => ({ ...prev, categoryId: undefined }))}
                  />
                  {categories.map((cat) => (
                    <Chip
                      key={cat._id}
                      label={cat.name}
                      selected={local.categoryId === cat._id}
                      onPress={() =>
                        setLocal((prev) => ({
                          ...prev,
                          categoryId:
                            prev.categoryId === cat._id
                              ? undefined
                              : (cat._id as Id<"productCategories">),
                        }))
                      }
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {facets?.brands.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Brand</Text>
                {facets.brands.map((brand) => (
                  <Checkbox
                    key={brand.slug}
                    checked={local.brandSlugs.includes(brand.slug)}
                    onChange={() =>
                      setLocal((prev) => ({
                        ...prev,
                        brandSlugs: toggleSlugList(prev.brandSlugs, brand.slug),
                      }))
                    }
                    label={
                      <Text style={styles.facetLabel}>
                        {brand.name}{" "}
                        <Text style={styles.facetCount}>({brand.count})</Text>
                      </Text>
                    }
                    style={styles.facetItem}
                  />
                ))}
              </View>
            ) : null}

            {facets?.colorFamilies.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Color</Text>
                {facets.colorFamilies.map((color) => (
                  <Checkbox
                    key={color.slug}
                    checked={local.colorSlugs.includes(color.slug)}
                    onChange={() =>
                      setLocal((prev) => ({
                        ...prev,
                        colorSlugs: toggleSlugList(prev.colorSlugs, color.slug),
                      }))
                    }
                    label={
                      <View style={styles.facetLabelRow}>
                        <ColorSwatch hex={color.hex} name={color.name} />
                        <Text style={styles.facetCount}>({color.count})</Text>
                      </View>
                    }
                    style={styles.facetItem}
                  />
                ))}
              </View>
            ) : null}

            {facets?.promotions.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Promotion</Text>
                {facets.promotions.map((promotion) => (
                  <Checkbox
                    key={promotion.slug}
                    checked={local.promotionSlugs.includes(
                      promotion.slug as PromotionFilterSlug
                    )}
                    onChange={() =>
                      setLocal((prev) => ({
                        ...prev,
                        promotionSlugs: togglePromotionSlug(
                          prev.promotionSlugs,
                          promotion.slug as PromotionFilterSlug
                        ),
                      }))
                    }
                    label={
                      <Text style={styles.facetLabel}>
                        {promotion.label}{" "}
                        <Text style={styles.facetCount}>({promotion.count})</Text>
                      </Text>
                    }
                    style={styles.facetItem}
                  />
                ))}
              </View>
            ) : null}

            {facets?.ratingBuckets.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Rating</Text>
                {facets.ratingBuckets.map((bucket) => (
                  <Checkbox
                    key={bucket.minRating}
                    checked={local.minRating === bucket.minRating}
                    onChange={() =>
                      setLocal((prev) => ({
                        ...prev,
                        minRating:
                          prev.minRating === bucket.minRating
                            ? undefined
                            : bucket.minRating,
                      }))
                    }
                    label={
                      <View style={styles.facetLabelRow}>
                        <RatingStars rating={bucket.minRating} size={12} />
                        <Text style={styles.facetLabel}>
                          {" "}
                          & up{" "}
                          <Text style={styles.facetCount}>({bucket.count})</Text>
                        </Text>
                      </View>
                    }
                    style={styles.facetItem}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Price</Text>
              <View style={styles.priceRow}>
                <View style={styles.priceInput}>
                  <Input
                    placeholder="Min"
                    keyboardType="numeric"
                    value={local.minPrice?.toString() ?? ""}
                    onChangeText={(text) =>
                      setLocal((prev) => ({
                        ...prev,
                        minPrice: text ? Number(text) : undefined,
                      }))
                    }
                  />
                </View>
                <Text style={styles.priceDash}>–</Text>
                <View style={styles.priceInput}>
                  <Input
                    placeholder="Max"
                    keyboardType="numeric"
                    value={local.maxPrice?.toString() ?? ""}
                    onChangeText={(text) =>
                      setLocal((prev) => ({
                        ...prev,
                        maxPrice: text ? Number(text) : undefined,
                      }))
                    }
                  />
                </View>
              </View>
              {priceBounds ? (
                <Text style={styles.hint}>
                  Store range: ${priceBounds.minPrice.toFixed(0)} – $
                  {priceBounds.maxPrice.toFixed(0)}
                </Text>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Availability</Text>
              <Checkbox
                checked={local.inStockOnly ?? false}
                onChange={(checked) =>
                  setLocal((prev) => ({ ...prev, inStockOnly: checked }))
                }
                label="In stock only"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Sort</Text>
              <View style={styles.sortList}>
                {SORT_OPTIONS.map((opt) => {
                  const selected = local.sort === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={opt.label}
                      onPress={() => setLocal((prev) => ({ ...prev, sort: opt.value }))}
                      style={({ pressed }) => [
                        styles.sortRow,
                        selected && styles.sortRowSelected,
                        pressed && styles.sortRowPressed,
                      ]}
                    >
                      <Text style={[styles.sortLabel, selected && styles.sortLabelSelected]}>
                        {opt.label}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark" size={18} color={colors.selected} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Button
              label="Clear all"
              variant="outline"
              onPress={handleReset}
              style={styles.actionButton}
            />
            <Button
              label="Apply filters"
              onPress={() => {
                onApply(local);
                onClose();
              }}
              style={styles.actionButton}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(
  colors: ColorPalette,
  textStyles: ReturnType<typeof createTextStyles>
) {
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
    maxHeight: "90%",
    ...shadows.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...textStyles.screenTitle,
    marginBottom: spacing.md,
  },
  scroll: {
    maxHeight: "72%",
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...textStyles.sectionTitle,
    fontSize: 15,
    marginBottom: spacing.md,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  facetItem: {
    marginBottom: spacing.sm,
  },
  facetLabel: {
    fontSize: typography.sm,
    color: colors.foreground,
  },
  facetLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  facetCount: {
    color: colors.muted,
    fontWeight: "400",
  },
  colorSwatchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  priceInput: {
    flex: 1,
  },
  priceDash: {
    ...textStyles.bodySmall,
    color: colors.muted,
  },
  hint: {
    ...textStyles.caption,
    marginTop: spacing.sm,
  },
  sortList: {
    gap: spacing.xs,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  sortRowSelected: {
    backgroundColor: colors.selectedMuted,
  },
  sortRowPressed: {
    opacity: 0.88,
  },
  sortLabel: {
    fontSize: typography.sm,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  sortLabelSelected: {
    color: colors.foreground,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  actionButton: {
    flex: 1,
  },
});
}

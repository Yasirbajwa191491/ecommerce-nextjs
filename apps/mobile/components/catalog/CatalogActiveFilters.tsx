import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";
import {
  clearAllCatalogFilters,
  togglePromotionSlug,
  toggleSlugList,
  type CatalogFilterState,
  type PromotionFilterSlug,
} from "@/lib/catalog/filters";

type CatalogActiveFiltersProps = {
  filters: CatalogFilterState;
  categoryName?: string;
  brandLabels: Record<string, string>;
  colorLabels: Record<string, string>;
  promotionLabels: Record<string, string>;
  onChange: (filters: CatalogFilterState) => void;
  preserveCategoryId?: boolean;
};

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createCatalogActiveFiltersStyles);

  return (
    <View style={styles.chip}>
      <Text style={styles.chipText} numberOfLines={1}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label} filter`}
        hitSlop={6}
        onPress={onRemove}
        style={styles.chipRemove}
      >
        <Ionicons name="close" size={12} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

export function CatalogActiveFilters({
  filters,
  categoryName,
  brandLabels,
  colorLabels,
  promotionLabels,
  onChange,
  preserveCategoryId = false,
}: CatalogActiveFiltersProps) {
  const styles = useThemedStyles(createCatalogActiveFiltersStyles);
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (filters.categoryId && categoryName) {
    chips.push({
      key: "category",
      label: categoryName,
      onRemove: () => onChange({ ...filters, categoryId: undefined }),
    });
  }

  for (const slug of filters.brandSlugs) {
    chips.push({
      key: `brand-${slug}`,
      label: brandLabels[slug] ?? slug,
      onRemove: () =>
        onChange({
          ...filters,
          brandSlugs: toggleSlugList(filters.brandSlugs, slug),
        }),
    });
  }

  for (const slug of filters.colorSlugs) {
    chips.push({
      key: `color-${slug}`,
      label: colorLabels[slug] ?? slug,
      onRemove: () =>
        onChange({
          ...filters,
          colorSlugs: toggleSlugList(filters.colorSlugs, slug),
        }),
    });
  }

  for (const slug of filters.promotionSlugs) {
    chips.push({
      key: `promotion-${slug}`,
      label: promotionLabels[slug] ?? slug,
      onRemove: () =>
        onChange({
          ...filters,
          promotionSlugs: togglePromotionSlug(
            filters.promotionSlugs,
            slug as PromotionFilterSlug
          ),
        }),
    });
  }

  if (filters.minRating !== undefined) {
    chips.push({
      key: "rating",
      label: `${filters.minRating}★+`,
      onRemove: () => onChange({ ...filters, minRating: undefined }),
    });
  }

  if (filters.inStockOnly) {
    chips.push({
      key: "inStock",
      label: "In stock",
      onRemove: () => onChange({ ...filters, inStockOnly: false }),
    });
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    chips.push({
      key: "price",
      label: "Price range",
      onRemove: () =>
        onChange({ ...filters, minPrice: undefined, maxPrice: undefined }),
    });
  }

  if (filters.search.trim()) {
    chips.push({
      key: "search",
      label: `"${filters.search.trim()}"`,
      onRemove: () => onChange({ ...filters, search: "" }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {chips.map((chip) => (
          <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear all filters"
          onPress={() =>
            onChange(
              clearAllCatalogFilters(filters, {
                preserveCategoryId,
              })
            )
          }
          style={styles.clearAll}
        >
          <Text style={styles.clearAllText}>Clear all</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function createCatalogActiveFiltersStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    wrapper: {
      marginBottom: spacing.sm,
    },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      paddingRight: spacing.md,
    },
    chip: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.xs,
      maxWidth: 160,
      paddingLeft: spacing.md,
      paddingRight: spacing.xs,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.full,
      backgroundColor: colors.chipBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    chipText: {
      flexShrink: 1,
      fontSize: typography.sm,
      fontWeight: "500" as const,
      color: colors.foreground,
    },
    chipRemove: {
      width: 24,
      height: 24,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    clearAll: {
      minHeight: 32,
      paddingHorizontal: spacing.sm,
      justifyContent: "center" as const,
    },
    clearAllText: {
      fontSize: typography.sm,
      fontWeight: "600" as const,
      color: colors.textSecondary,
    },
  });
}

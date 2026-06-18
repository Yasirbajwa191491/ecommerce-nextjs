"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CatalogFilterState } from "@/lib/shop/catalog-filter-url";

type ActiveFilterChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

type CatalogActiveFiltersProps = {
  filters: CatalogFilterState;
  categoryName?: string;
  brandLabels: Record<string, string>;
  colorLabels: Record<string, string>;
  promotionLabels: Record<string, string>;
  onClearAll: () => void;
  onRemoveCategory: () => void;
  onToggleBrand: (slug: string) => void;
  onToggleColor: (slug: string) => void;
  onTogglePromotion: (slug: string) => void;
  onClearRating: () => void;
  onClearPrice: () => void;
};

export function CatalogActiveFilters({
  filters,
  categoryName,
  brandLabels,
  colorLabels,
  promotionLabels,
  onClearAll,
  onRemoveCategory,
  onToggleBrand,
  onToggleColor,
  onTogglePromotion,
  onClearRating,
  onClearPrice,
}: CatalogActiveFiltersProps) {
  const chips: ActiveFilterChip[] = [];

  if (filters.categorySlug && categoryName) {
    chips.push({
      key: "category",
      label: categoryName,
      onRemove: onRemoveCategory,
    });
  }

  for (const slug of filters.brandSlugs) {
    chips.push({
      key: `brand-${slug}`,
      label: brandLabels[slug] ?? slug,
      onRemove: () => onToggleBrand(slug),
    });
  }

  for (const slug of filters.colorSlugs) {
    chips.push({
      key: `color-${slug}`,
      label: colorLabels[slug] ?? slug,
      onRemove: () => onToggleColor(slug),
    });
  }

  for (const slug of filters.promotionSlugs) {
    chips.push({
      key: `promotion-${slug}`,
      label: promotionLabels[slug] ?? slug,
      onRemove: () => onTogglePromotion(slug),
    });
  }

  if (filters.minRating !== undefined) {
    chips.push({
      key: "rating",
      label: `${filters.minRating}+ Stars`,
      onRemove: onClearRating,
    });
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    chips.push({
      key: "price",
      label: "Price range",
      onRemove: onClearPrice,
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="gap-1 pr-1">
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            className="rounded-full p-0.5 hover:bg-muted"
            aria-label={`Remove ${chip.label} filter`}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={onClearAll} className="h-7 px-2">
        Clear all
      </Button>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProductCategory } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_CURRENCY, formatCurrencyAmount } from "@/lib/currencies";
import {
  buildPriceTicks,
  formatCompactPrice,
} from "@/lib/shop/price-ticks";
import { SHOP_BADGE, SHOP_BODY_SM, SHOP_SUBSECTION_TITLE } from "@/lib/typography";
import { cn } from "@/lib/utils";
import {
  FILTER_OPTION_LIST_CLASS,
  FilterCheckboxList,
  FilterSidebarSection,
  FilterSidebarSections,
  ColorFamilyFilterSection,
  RatingFilterSection,
} from "@/components/products/catalog-filter-sections";

type FacetData = {
  brands: Array<{ name: string; slug: string; count: number }>;
  colorFamilies: Array<{ name: string; slug: string; hex?: string; count: number }>;
  promotions: Array<{ slug: string; label: string; count: number }>;
  ratingBuckets: Array<{ minRating: number; label: string; count: number }>;
};

type ProductCatalogFiltersProps = {
  categories: ProductCategory[];
  categoryId: Id<"productCategories"> | "all";
  onCategoryChange: (value: Id<"productCategories"> | "all") => void;
  priceBounds: { minPrice: number; maxPrice: number };
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  facets?: FacetData;
  selectedBrandSlugs: string[];
  selectedColorSlugs: string[];
  selectedPromotionSlugs: string[];
  selectedMinRating?: number;
  onToggleBrand: (slug: string) => void;
  onToggleColor: (slug: string) => void;
  onTogglePromotion: (slug: string) => void;
  onSelectRating: (minRating: number | undefined) => void;
  onClear: () => void;
  className?: string;
  showHeader?: boolean;
};

export function ProductCatalogFilters({
  categories,
  categoryId,
  onCategoryChange,
  priceBounds,
  priceRange,
  onPriceRangeChange,
  facets,
  selectedBrandSlugs,
  selectedColorSlugs,
  selectedPromotionSlugs,
  selectedMinRating,
  onToggleBrand,
  onToggleColor,
  onTogglePromotion,
  onSelectRating,
  onClear,
  className,
  showHeader = true,
}: ProductCatalogFiltersProps) {
  const ticks = useMemo(
    () => buildPriceTicks(priceBounds.minPrice, priceBounds.maxPrice),
    [priceBounds.minPrice, priceBounds.maxPrice]
  );

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const sliderDisabled = priceBounds.maxPrice <= priceBounds.minPrice;

  return (
    <aside
      className={cn(
        "flex flex-col rounded-2xl border border-border/60 bg-card p-4 shadow-sm md:p-5 lg:min-h-[calc(100vh-11rem)] lg:p-6",
        className
      )}
    >
      {showHeader ? (
        <div className="mb-6 flex items-center gap-2.5 border-b border-border/60 pb-5">
          <SlidersHorizontal className="size-4 shrink-0 text-[#6254f3]" />
          <h2 className={SHOP_SUBSECTION_TITLE}>Filters</h2>
        </div>
      ) : null}

      <FilterSidebarSections>
      <FilterSidebarSection title="Category">
        <div className={FILTER_OPTION_LIST_CLASS}>
          <CategoryOption
            optionId="category-all"
            label="All categories"
            checked={categoryId === "all"}
            onSelect={() => onCategoryChange("all")}
          />
          {sortedCategories.map((category) => (
            <CategoryOption
              key={category._id}
              optionId={`category-${category._id}`}
              label={category.name}
              checked={categoryId === category._id}
              onSelect={() => onCategoryChange(category._id)}
            />
          ))}
        </div>
      </FilterSidebarSection>

      {facets !== undefined ? (
        <>
          <FilterCheckboxList
            title="Brand"
            section
            items={facets.brands.map((brand) => ({
              id: brand.slug,
              label: brand.name,
              count: brand.count,
            }))}
            selected={selectedBrandSlugs}
            onToggle={onToggleBrand}
          />
          <FilterCheckboxList
            title="Promotions"
            section
            items={facets.promotions.map((promotion) => ({
              id: promotion.slug,
              label: promotion.label,
              count: promotion.count,
            }))}
            selected={selectedPromotionSlugs}
            onToggle={onTogglePromotion}
          />
          <RatingFilterSection
            section
            buckets={facets.ratingBuckets}
            selected={selectedMinRating}
            onSelect={onSelectRating}
          />
          <ColorFamilyFilterSection
            section
            colors={facets.colorFamilies}
            selected={selectedColorSlugs}
            onToggle={onToggleColor}
          />
        </>
      ) : null}

      <FilterSidebarSection title="Price range">
        <div className="space-y-3">
          <div className="flex justify-end">
            <span
              className={cn(
                "w-fit rounded-full bg-muted px-2.5 py-1 text-foreground tabular-nums",
                SHOP_BADGE
              )}
            >
              {formatCurrencyAmount(priceRange[0], DEFAULT_CURRENCY)} –{" "}
              {formatCurrencyAmount(priceRange[1], DEFAULT_CURRENCY)}
            </span>
          </div>
          <Slider
            min={priceBounds.minPrice}
            max={priceBounds.maxPrice}
            step={1}
            value={priceRange}
            onValueChange={(value) => {
              const next = value as number[];
              if (next.length >= 2) {
                onPriceRangeChange([next[0], next[1]]);
              }
            }}
            disabled={sliderDisabled}
            className="py-2 lg:py-3"
          />
          <div className={cn("hidden justify-between gap-1 tabular-nums md:flex", SHOP_BODY_SM)}>
            {ticks.map((tick) => (
              <span key={tick}>{formatCompactPrice(tick)}</span>
            ))}
          </div>
        </div>
      </FilterSidebarSection>
      </FilterSidebarSections>

      <Button
        type="button"
        variant="outline"
        onClick={onClear}
        className="mt-6 h-9 w-full text-sm"
      >
        Clear filters
      </Button>
    </aside>
  );
}

function CategoryOption({
  label,
  checked,
  onSelect,
  optionId,
}: {
  label: string;
  checked: boolean;
  onSelect: () => void;
  optionId: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        id={optionId}
        role="radio"
        aria-checked={checked}
        onClick={onSelect}
        className={cn(
          "size-4 shrink-0 rounded-full border-2 p-0 transition-colors",
          checked ? "border-[#6254f3] bg-[#6254f3]" : "border-border bg-background"
        )}
        title={label}
      />
      <Label
        htmlFor={optionId}
        onClick={onSelect}
        className={cn(
          "flex flex-1 cursor-pointer text-sm font-normal capitalize leading-none",
          checked ? "font-medium text-[#6254f3]" : "text-foreground"
        )}
      >
        {label}
      </Label>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProductCategory } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { DEFAULT_CURRENCY, formatCurrencyAmount } from "@/lib/currencies";
import {
  buildPriceTicks,
  formatCompactPrice,
} from "@/lib/shop/price-ticks";
import { cn } from "@/lib/utils";
import { FilterCheckboxList } from "@/components/products/catalog-filter-sections/filter-checkbox-list";
import { ColorFamilyFilterSection } from "@/components/products/catalog-filter-sections/color-family-filter-section";
import { RatingFilterSection } from "@/components/products/catalog-filter-sections/rating-filter-section";

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
        "flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm md:gap-5 md:p-5 lg:min-h-[calc(100vh-11rem)] lg:gap-6 lg:p-6",
        className
      )}
    >
      {showHeader ? (
        <>
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="size-4 shrink-0 text-[#6254f3]" />
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Filters
            </h2>
          </div>
          <Separator className="lg:my-0" />
        </>
      ) : null}

      <div className="space-y-3 lg:space-y-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Category
        </p>
        <div className="flex flex-col gap-1.5">
          <CategoryOption
            label="All categories"
            checked={categoryId === "all"}
            onSelect={() => onCategoryChange("all")}
          />
          {sortedCategories.map((category) => (
            <CategoryOption
              key={category._id}
              label={category.name}
              checked={categoryId === category._id}
              onSelect={() => onCategoryChange(category._id)}
            />
          ))}
        </div>
      </div>

      {facets ? (
        <>
          <Separator />
          <FilterCheckboxList
            title="Brand"
            items={facets.brands.map((brand) => ({
              id: brand.slug,
              label: brand.name,
              count: brand.count,
            }))}
            selected={selectedBrandSlugs}
            onToggle={onToggleBrand}
          />
          <Separator />
          <FilterCheckboxList
            title="Promotions"
            items={facets.promotions.map((promotion) => ({
              id: promotion.slug,
              label: promotion.label,
              count: promotion.count,
            }))}
            selected={selectedPromotionSlugs}
            onToggle={onTogglePromotion}
          />
          <Separator />
          <RatingFilterSection
            buckets={facets.ratingBuckets}
            selected={selectedMinRating}
            onSelect={onSelectRating}
          />
          <Separator />
          <ColorFamilyFilterSection
            colors={facets.colorFamilies}
            selected={selectedColorSlugs}
            onToggle={onToggleColor}
          />
        </>
      ) : null}

      <Separator />

      <div className="space-y-3 lg:space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Price range
          </p>
          <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground tabular-nums">
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
        <div className="hidden justify-between gap-1 text-[11px] font-medium text-muted-foreground tabular-nums md:flex">
          {ticks.map((tick) => (
            <span key={tick}>{formatCompactPrice(tick)}</span>
          ))}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onClear}
        className="mt-auto h-9 w-full text-sm lg:mt-auto"
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
}: {
  label: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs capitalize transition-colors md:gap-3 md:px-3 md:py-2.5 md:text-sm",
        checked
          ? "bg-[#6254f3]/8 font-medium text-[#6254f3]"
          : "text-foreground hover:bg-muted/60"
      )}
      title={label}
    >
      <span
        className={cn(
          "size-3.5 shrink-0 rounded-full border-2 md:size-4",
          checked ? "border-[#6254f3] bg-[#6254f3]" : "border-border bg-background"
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

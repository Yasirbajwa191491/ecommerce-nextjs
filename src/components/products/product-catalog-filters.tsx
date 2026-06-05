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

type ProductCatalogFiltersProps = {
  categories: ProductCategory[];
  categoryId: Id<"productCategories"> | "all";
  onCategoryChange: (value: Id<"productCategories"> | "all") => void;
  priceBounds: { minPrice: number; maxPrice: number };
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  onClear: () => void;
  className?: string;
};

export function ProductCatalogFilters({
  categories,
  categoryId,
  onCategoryChange,
  priceBounds,
  priceRange,
  onPriceRangeChange,
  onClear,
  className,
}: ProductCatalogFiltersProps) {
  const ticks = useMemo(
    () => buildPriceTicks(priceBounds.minPrice, priceBounds.maxPrice),
    [priceBounds.minPrice, priceBounds.maxPrice]
  );

  const sliderDisabled = priceBounds.maxPrice <= priceBounds.minPrice;

  return (
    <aside
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-sm sm:gap-4 sm:rounded-2xl sm:p-4 md:gap-5 md:p-5 lg:min-h-[calc(100vh-11rem)] lg:gap-6 lg:p-6 lg:shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <SlidersHorizontal className="size-3.5 shrink-0 text-[#6254f3] sm:size-4" />
        <h2 className="text-xs font-semibold tracking-tight text-foreground sm:text-base">
          Filters
        </h2>
      </div>

      <Separator className="lg:my-0" />

      <div className="space-y-2 sm:space-y-3 lg:space-y-4">
        <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase sm:text-xs">
          Category
        </p>
        <div className="flex flex-col gap-1 sm:gap-1.5">
          <CategoryOption
            label="All categories"
            checked={categoryId === "all"}
            onSelect={() => onCategoryChange("all")}
          />
          {categories.map((category) => (
            <CategoryOption
              key={category._id}
              label={category.name}
              checked={categoryId === category._id}
              onSelect={() => onCategoryChange(category._id)}
            />
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-2 sm:space-y-3 lg:space-y-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase sm:text-xs">
            Price range
          </p>
          <span className="w-fit rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-foreground tabular-nums sm:px-2.5 sm:py-1 sm:text-[11px]">
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
          className="py-1 sm:py-2 lg:py-3"
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
        className="mt-auto h-8 w-full text-xs sm:h-9 sm:text-sm lg:mt-auto"
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
        "flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-[11px] capitalize transition-colors sm:gap-2 sm:rounded-lg sm:px-2.5 sm:py-2 sm:text-xs md:gap-3 md:px-3 md:py-2.5 md:text-sm",
        checked
          ? "bg-[#6254f3]/8 font-medium text-[#6254f3]"
          : "text-foreground hover:bg-muted/60"
      )}
      title={label}
    >
      <span
        className={cn(
          "size-3 shrink-0 rounded-full border-2 sm:size-3.5 md:size-4",
          checked ? "border-[#6254f3] bg-[#6254f3]" : "border-border bg-background"
        )}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </button>
  );
}

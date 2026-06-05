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
        "flex min-h-[28rem] flex-col gap-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:min-h-[32rem] sm:p-7 lg:min-h-[calc(100vh-11rem)]",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <SlidersHorizontal className="size-4 text-[#6254f3]" />
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Filters
        </h2>
      </div>

      <Separator />

      <div className="space-y-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Category
        </p>
        <div className="flex flex-col gap-1.5">
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

      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Price range
          </p>
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground tabular-nums">
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
          className="py-3"
        />
        <div className="flex justify-between gap-1 text-[11px] font-medium text-muted-foreground tabular-nums">
          {ticks.map((tick) => (
            <span key={tick}>{formatCompactPrice(tick)}</span>
          ))}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onClear}
        className="mt-auto w-full"
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
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm capitalize transition-colors",
        checked
          ? "bg-[#6254f3]/8 font-medium text-[#6254f3]"
          : "text-foreground hover:bg-muted/60"
      )}
    >
      <span
        className={cn(
          "size-4 shrink-0 rounded-full border-2",
          checked ? "border-[#6254f3] bg-[#6254f3]" : "border-border bg-background"
        )}
        aria-hidden
      />
      {label}
    </button>
  );
}

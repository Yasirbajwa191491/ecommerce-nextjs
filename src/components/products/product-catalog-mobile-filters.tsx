"use client";

import { SlidersHorizontal, X } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProductCategory } from "@/types/product";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProductCatalogFilters } from "@/components/products/product-catalog-filters";
import { cn } from "@/lib/utils";

type FacetData = {
  brands: Array<{ name: string; slug: string; count: number }>;
  colorFamilies: Array<{ name: string; slug: string; hex?: string; count: number }>;
  promotions: Array<{ slug: string; label: string; count: number }>;
  ratingBuckets: Array<{ minRating: number; label: string; count: number }>;
};

type ProductCatalogMobileFiltersProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  activeFilterCount: number;
};

export function ProductCatalogMobileFilters({
  open,
  onOpenChange,
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
  activeFilterCount,
}: ProductCatalogMobileFiltersProps) {
  const sortedCategories = [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  return (
    <div className="mb-4 space-y-3 md:hidden">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(true)}
          className="h-10 flex-1 justify-center gap-2 rounded-xl border-border/80 bg-card text-sm font-medium shadow-sm"
        >
          <SlidersHorizontal className="size-4 text-[#6254f3]" />
          Filters
          {activeFilterCount > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#6254f3] px-1.5 py-0.5 text-sm font-semibold text-white tabular-nums">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <CategoryChip
          label="All"
          selected={categoryId === "all"}
          onSelect={() => onCategoryChange("all")}
        />
        {sortedCategories.map((category) => (
          <CategoryChip
            key={category._id}
            label={category.name}
            selected={categoryId === category._id}
            onSelect={() => onCategoryChange(category._id)}
          />
        ))}
      </div>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="flex h-dvh max-h-dvh w-[min(100vw-1rem,22rem)] max-w-none flex-col gap-0 overflow-hidden rounded-none border-r border-border/60 bg-card p-0 shadow-xl inset-y-0"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3.5">
            <SheetTitle className="m-0 text-lg font-semibold tracking-tight text-foreground">
              Filters
            </SheetTitle>
            <SheetClose
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0 rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  aria-label="Close filters"
                />
              }
            >
              <X className="size-5" />
            </SheetClose>
          </div>

          <ProductCatalogFilters
            categories={categories}
            categoryId={categoryId}
            onCategoryChange={onCategoryChange}
            priceBounds={priceBounds}
            priceRange={priceRange}
            onPriceRangeChange={onPriceRangeChange}
            facets={facets}
            selectedBrandSlugs={selectedBrandSlugs}
            selectedColorSlugs={selectedColorSlugs}
            selectedPromotionSlugs={selectedPromotionSlugs}
            selectedMinRating={selectedMinRating}
            onToggleBrand={onToggleBrand}
            onToggleColor={onToggleColor}
            onTogglePromotion={onTogglePromotion}
            onSelectRating={onSelectRating}
            onClear={() => {
              onClear();
              onOpenChange(false);
            }}
            showHeader={false}
            layout="sheet"
            className="min-h-0 flex-1 border-0 bg-transparent p-4 shadow-none"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CategoryChip({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium capitalize transition-colors",
        selected
          ? "border-[#6254f3] bg-[#6254f3]/10 text-[#6254f3]"
          : "border-border/80 bg-card text-foreground hover:bg-muted/50"
      )}
    >
      {label}
    </button>
  );
}

"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ProductStars } from "@/components/products/product-stars";
import {
  FILTER_OPTION_LIST_CLASS,
  FilterSidebarSection,
} from "@/components/products/catalog-filter-sections/filter-sidebar-section";
import { SHOP_META_LABEL } from "@/lib/typography";
import { cn } from "@/lib/utils";

type RatingFilterProps = {
  buckets: Array<{ minRating: number; label: string; count: number }>;
  selected?: number;
  onSelect: (minRating: number | undefined) => void;
  className?: string;
  section?: boolean;
};

export function RatingFilterSection({
  buckets,
  selected,
  onSelect,
  className,
  section = false,
}: RatingFilterProps) {
  if (buckets.every((bucket) => bucket.count === 0)) return null;

  const content = (
    <div className={FILTER_OPTION_LIST_CLASS}>
      {buckets.map((bucket) => {
        const checked = selected === bucket.minRating;
        return (
          <div key={bucket.minRating} className="flex items-center gap-2.5">
            <Checkbox
              id={`rating-${bucket.minRating}`}
              checked={checked}
              onCheckedChange={() =>
                onSelect(checked ? undefined : bucket.minRating)
              }
            />
            <Label
              htmlFor={`rating-${bucket.minRating}`}
              className="flex flex-1 cursor-pointer items-center justify-between text-sm font-normal"
            >
              <ProductStars
                rating={bucket.minRating}
                showValue={false}
                className="gap-0.5"
              />
              <span className="sr-only">{bucket.label}</span>
              <span className="text-sm text-muted-foreground">
                ({bucket.count})
              </span>
            </Label>
          </div>
        );
      })}
    </div>
  );

  if (section) {
    return (
      <FilterSidebarSection title="Rating" className={className}>
        {content}
      </FilterSidebarSection>
    );
  }

  return (
    <div className={cn("space-y-3 lg:space-y-4", className)}>
      <p className={SHOP_META_LABEL}>
        Rating
      </p>
      {content}
    </div>
  );
}

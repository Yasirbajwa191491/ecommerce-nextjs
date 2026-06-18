"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ProductStars } from "@/components/products/product-stars";
import { cn } from "@/lib/utils";

type RatingFilterProps = {
  buckets: Array<{ minRating: number; label: string; count: number }>;
  selected?: number;
  onSelect: (minRating: number | undefined) => void;
  className?: string;
};

export function RatingFilterSection({
  buckets,
  selected,
  onSelect,
  className,
}: RatingFilterProps) {
  if (buckets.every((bucket) => bucket.count === 0)) return null;

  return (
    <div className={cn("space-y-3 lg:space-y-4", className)}>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Rating
      </p>
      <div className="flex flex-col gap-2">
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
                <span className="flex items-center gap-2">
                  <ProductStars rating={bucket.minRating} className="[&_span]:hidden" />
                  <span>{bucket.label}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  ({bucket.count})
                </span>
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

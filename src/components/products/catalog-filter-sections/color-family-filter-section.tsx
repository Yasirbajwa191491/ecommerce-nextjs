"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ColorSwatch } from "@/components/cart/cart-product-display";
import {
  FILTER_OPTION_LIST_CLASS,
  FilterSidebarSection,
} from "@/components/products/catalog-filter-sections/filter-sidebar-section";
import { getColorFamilyHex } from "@/lib/color-families";
import { SHOP_META_LABEL } from "@/lib/typography";
import { cn } from "@/lib/utils";

type ColorFamilyFilterProps = {
  colors: Array<{ name: string; slug: string; hex?: string; count: number }>;
  selected: string[];
  onToggle: (slug: string) => void;
  className?: string;
  section?: boolean;
};

export function ColorFamilyFilterSection({
  colors,
  selected,
  onToggle,
  className,
  section = false,
}: ColorFamilyFilterProps) {
  if (colors.length === 0) return null;

  const content = (
    <div className={FILTER_OPTION_LIST_CLASS}>
      {colors.map((color) => {
        const checked = selected.includes(color.slug.toLowerCase());
        const hex = color.hex ?? getColorFamilyHex(color.name) ?? "#CCCCCC";
        return (
          <div key={color.slug} className="flex items-center gap-2.5">
            <Checkbox
              id={`color-${color.slug}`}
              checked={checked}
              onCheckedChange={() => onToggle(color.slug)}
            />
            <Label
              htmlFor={`color-${color.slug}`}
              className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 text-sm font-normal"
            >
              <span className="flex min-w-0 items-center gap-2">
                <ColorSwatch color={hex} showLabel={false} />
                <span className="truncate">{color.name}</span>
              </span>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                ({color.count})
              </span>
            </Label>
          </div>
        );
      })}
    </div>
  );

  if (section) {
    return (
      <FilterSidebarSection title="Color Family" className={className}>
        {content}
      </FilterSidebarSection>
    );
  }

  return (
    <div className={cn("space-y-3 lg:space-y-4", className)}>
      <p className={SHOP_META_LABEL}>
        Color Family
      </p>
      {content}
    </div>
  );
}

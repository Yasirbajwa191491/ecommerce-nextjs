"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ColorSwatch } from "@/components/cart/cart-product-display";
import { getColorFamilyHex } from "@/lib/color-families";
import { cn } from "@/lib/utils";

type ColorFamilyFilterProps = {
  colors: Array<{ name: string; slug: string; hex?: string; count: number }>;
  selected: string[];
  onToggle: (slug: string) => void;
  className?: string;
};

export function ColorFamilyFilterSection({
  colors,
  selected,
  onToggle,
  className,
}: ColorFamilyFilterProps) {
  if (colors.length === 0) return null;

  return (
    <div className={cn("space-y-3 lg:space-y-4", className)}>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Color Family
      </p>
      <div className="flex flex-col gap-2">
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
                className="flex flex-1 cursor-pointer items-center justify-between text-sm font-normal"
              >
                <span className="flex items-center gap-2">
                  <ColorSwatch color={hex} />
                  <span>{color.name}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  ({color.count})
                </span>
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

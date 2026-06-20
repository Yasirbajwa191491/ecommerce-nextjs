"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  FILTER_OPTION_LIST_CLASS,
  FilterSidebarSection,
} from "@/components/products/catalog-filter-sections/filter-sidebar-section";
import { SHOP_BODY_SM, SHOP_META_LABEL } from "@/lib/typography";
import { cn } from "@/lib/utils";

type FilterCheckboxListProps = {
  title: string;
  items: Array<{ id: string; label: string; count: number }>;
  selected: string[];
  onToggle: (id: string) => void;
  className?: string;
  /** Wrap in a spaced sidebar section with divider */
  section?: boolean;
};

export function FilterCheckboxList({
  title,
  items,
  selected,
  onToggle,
  className,
  section = false,
}: FilterCheckboxListProps) {
  if (items.length === 0) return null;

  const content = (
    <div className={FILTER_OPTION_LIST_CLASS}>
      {items.map((item) => {
        const checked = selected.includes(item.id.toLowerCase());
        return (
          <div key={item.id} className="flex items-center gap-2.5">
            <Checkbox
              id={`filter-${title}-${item.id}`}
              checked={checked}
              onCheckedChange={() => onToggle(item.id)}
            />
            <Label
              htmlFor={`filter-${title}-${item.id}`}
              className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 text-sm font-normal"
            >
              <span className="truncate">{item.label}</span>
              <span className={cn("shrink-0 tabular-nums", SHOP_BODY_SM)}>
                ({item.count})
              </span>
            </Label>
          </div>
        );
      })}
    </div>
  );

  if (section) {
    return (
      <FilterSidebarSection title={title} className={className}>
        {content}
      </FilterSidebarSection>
    );
  }

  return (
    <div className={cn("space-y-3 lg:space-y-4", className)}>
      <p className={SHOP_META_LABEL}>{title}</p>
      {content}
    </div>
  );
}

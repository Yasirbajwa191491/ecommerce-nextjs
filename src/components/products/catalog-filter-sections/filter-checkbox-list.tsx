"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FilterCheckboxListProps = {
  title: string;
  items: Array<{ id: string; label: string; count: number }>;
  selected: string[];
  onToggle: (id: string) => void;
  className?: string;
};

export function FilterCheckboxList({
  title,
  items,
  selected,
  onToggle,
  className,
}: FilterCheckboxListProps) {
  if (items.length === 0) return null;

  return (
    <div className={cn("space-y-3 lg:space-y-4", className)}>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <div className="flex flex-col gap-2">
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
                className="flex flex-1 cursor-pointer items-center justify-between text-sm font-normal"
              >
                <span>{item.label}</span>
                <span className="text-xs text-muted-foreground">({item.count})</span>
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

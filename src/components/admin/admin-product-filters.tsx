"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SlidersHorizontal } from "lucide-react";

export type ProductListFilters = {
  minPrice: string;
  maxPrice: string;
  minStock: string;
  maxStock: string;
  minStars: string;
};

export const emptyProductFilters = (): ProductListFilters => ({
  minPrice: "",
  maxPrice: "",
  minStock: "",
  maxStock: "",
  minStars: "",
});

export function hasActiveProductFilters(filters: ProductListFilters) {
  return Object.values(filters).some((value) => value.trim() !== "");
}

type AdminProductFiltersProps = {
  filters: ProductListFilters;
  onChange: (filters: ProductListFilters) => void;
  onClear: () => void;
};

export function AdminProductFilters({
  filters,
  onChange,
  onClear,
}: AdminProductFiltersProps) {
  const active = hasActiveProductFilters(filters);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" className="shrink-0">
            <SlidersHorizontal className="size-4" />
            Filters
            {active ? (
              <span className="ml-1 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] text-background">
                On
              </span>
            ) : null}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-72">
        <PopoverHeader>
          <PopoverTitle>Filter products</PopoverTitle>
        </PopoverHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="filter-min-price">Min price</Label>
              <Input
                id="filter-min-price"
                type="number"
                min={0}
                value={filters.minPrice}
                onChange={(e) =>
                  onChange({ ...filters, minPrice: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-max-price">Max price</Label>
              <Input
                id="filter-max-price"
                type="number"
                min={0}
                value={filters.maxPrice}
                onChange={(e) =>
                  onChange({ ...filters, maxPrice: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="filter-min-stock">Min stock</Label>
              <Input
                id="filter-min-stock"
                type="number"
                min={0}
                value={filters.minStock}
                onChange={(e) =>
                  onChange({ ...filters, minStock: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-max-stock">Max stock</Label>
              <Input
                id="filter-max-stock"
                type="number"
                min={0}
                value={filters.maxStock}
                onChange={(e) =>
                  onChange({ ...filters, maxStock: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-min-stars">Min rating (0–5)</Label>
            <Input
              id="filter-min-stars"
              type="number"
              min={0}
              max={5}
              step="0.1"
              value={filters.minStars}
              onChange={(e) =>
                onChange({ ...filters, minStars: e.target.value })
              }
            />
          </div>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={!active}>
            Clear filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function toProductFilterArgs(filters: ProductListFilters) {
  const parse = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : undefined;
  };

  return {
    minPrice: parse(filters.minPrice),
    maxPrice: parse(filters.maxPrice),
    minStock: parse(filters.minStock),
    maxStock: parse(filters.maxStock),
    minStars: parse(filters.minStars),
  };
}

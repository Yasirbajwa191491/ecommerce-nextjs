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

export type ReviewCallListFilters = {
  orderNumber: string;
  dateFrom: string;
  dateTo: string;
};

export const emptyReviewCallFilters = (): ReviewCallListFilters => ({
  orderNumber: "",
  dateFrom: "",
  dateTo: "",
});

export function hasActiveReviewCallFilters(filters: ReviewCallListFilters) {
  return Object.values(filters).some((value) => value.trim() !== "");
}

type AdminReviewCallFiltersProps = {
  filters: ReviewCallListFilters;
  onChange: (filters: ReviewCallListFilters) => void;
  onClear: () => void;
};

export function AdminReviewCallFilters({
  filters,
  onChange,
  onClear,
}: AdminReviewCallFiltersProps) {
  const active = hasActiveReviewCallFilters(filters);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="w-full shrink-0 sm:w-auto">
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
      <PopoverContent
        align="end"
        className="w-[min(20rem,calc(100vw-2rem))]"
      >
        <PopoverHeader>
          <PopoverTitle>Filter review calls</PopoverTitle>
        </PopoverHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="filter-review-call-order">Order number</Label>
            <Input
              id="filter-review-call-order"
              value={filters.orderNumber}
              placeholder="ORD-..."
              onChange={(e) =>
                onChange({ ...filters, orderNumber: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="filter-review-call-from">From date</Label>
              <Input
                id="filter-review-call-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  onChange({ ...filters, dateFrom: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-review-call-to">To date</Label>
              <Input
                id="filter-review-call-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  onChange({ ...filters, dateTo: e.target.value })
                }
              />
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={!active}>
            Clear filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function toReviewCallFilterArgs(filters: ReviewCallListFilters) {
  const parseDate = (value: string, endOfDay = false) => {
    if (!value.trim()) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date.getTime();
  };

  return {
    orderNumber: filters.orderNumber.trim() || undefined,
    dateFrom: parseDate(filters.dateFrom),
    dateTo: parseDate(filters.dateTo, true),
  };
}

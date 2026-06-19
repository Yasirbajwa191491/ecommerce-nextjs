"use client";

import { LayoutGrid, List } from "lucide-react";
import type { ProductSort } from "@/lib/shop/product-sort";
import { PRODUCT_SORT_OPTIONS } from "@/lib/shop/product-sort";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SHOP_BODY_SM } from "@/lib/typography";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";

type ProductCatalogToolbarProps = {
  totalCount: number;
  searchQuery?: string;
  isSearching?: boolean;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  sort: ProductSort;
  onSortChange: (sort: ProductSort) => void;
};

export function ProductCatalogToolbar({
  totalCount,
  searchQuery,
  isSearching = false,
  view,
  onViewChange,
  sort,
  onSortChange,
}: ProductCatalogToolbarProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 shadow-sm sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0">
        <p className={SHOP_BODY_SM}>
          {isSearching ? (
            <span className="font-medium text-foreground">Searching…</span>
          ) : (
            <>
              <span className="font-semibold text-foreground tabular-nums">
                {totalCount}
              </span>{" "}
              {totalCount === 1 ? "product" : "products"}
              {searchQuery ? (
                <>
                  {" "}
                  for{" "}
                  <span className="font-medium text-foreground">
                    &ldquo;{searchQuery}&rdquo;
                  </span>
                </>
              ) : null}
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <div className="flex items-center rounded-xl border border-border/80 bg-muted/30 p-1.5">
          <Button
            type="button"
            variant={view === "grid" ? "default" : "ghost"}
            size="icon"
            onClick={() => onViewChange("grid")}
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            className={cn(
              "size-10 rounded-lg",
              view === "grid" && "bg-[#6254f3] text-white hover:bg-[#5548e0]"
            )}
          >
            <LayoutGrid className="size-5" />
          </Button>
          <Button
            type="button"
            variant={view === "list" ? "default" : "ghost"}
            size="icon"
            onClick={() => onViewChange("list")}
            aria-label="List view"
            aria-pressed={view === "list"}
            className={cn(
              "size-10 rounded-lg",
              view === "list" && "bg-[#6254f3] text-white hover:bg-[#5548e0]"
            )}
          >
            <List className="size-5" />
          </Button>
        </div>

        <Select
          value={sort}
          onValueChange={(value) =>
            onSortChange((value ?? "default") as ProductSort)
          }
        >
          <SelectTrigger className="h-9 w-[min(100%,12rem)] rounded-xl border-border/80 bg-background">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent align="end">
            {PRODUCT_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

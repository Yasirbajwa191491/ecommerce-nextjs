"use client";

import { useEffect, useMemo, useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getPrimaryImageUrl } from "@/lib/product-images";
import Image from "next/image";
import { Check, X } from "lucide-react";
import { invalidInputClass } from "@/components/admin/admin-form-field";
import { FieldError } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type PromotionProductPickerProps = {
  label: string;
  value: Id<"products"> | "";
  selectedName?: string;
  onChange: (id: Id<"products">, name: string) => void;
  onClear?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  hideLabel?: boolean;
  error?: string;
};

export function PromotionProductPicker({
  label,
  value,
  selectedName,
  onChange,
  onClear,
  onBlur,
  disabled,
  hideLabel,
  error,
}: PromotionProductPickerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const selectedProduct = useQuery(
    api.products.getById,
    value ? { id: value } : "skip"
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.products.listPaginated,
    { active: true, search: search || undefined },
    { initialNumItems: 8 }
  );

  const displayName = selectedProduct?.name ?? selectedName ?? "";
  const displayImageUrl = selectedProduct
    ? getPrimaryImageUrl(selectedProduct, "")
    : "";

  const listProducts = useMemo(() => {
    if (!value || !selectedProduct) return results;
    if (results.some((product) => product._id === value)) return results;
    return [selectedProduct, ...results];
  }, [results, selectedProduct, value]);

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }
    onChange("" as Id<"products">, "");
  };

  return (
    <div className="space-y-2">
      {!hideLabel ? <p className="text-sm font-medium">{label}</p> : null}

      {value && displayName ? (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <div className="relative size-10 shrink-0 overflow-hidden rounded-md border bg-muted">
            {displayImageUrl ? (
              <Image
                src={displayImageUrl}
                alt={displayName}
                fill
                className="object-cover"
                unoptimized
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <Badge variant="secondary" className="mt-0.5 gap-1 text-[10px]">
              <Check className="size-3" />
              Selected
            </Badge>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            disabled={disabled}
            onClick={handleClear}
            aria-label="Clear selection"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : null}

      <Input
        placeholder="Search products…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={!!error}
        className={invalidInputClass(error)}
      />
      <div
        className={cn(
          "max-h-48 space-y-1 overflow-y-auto rounded-md border p-2",
          error && "border-destructive"
        )}
      >
        {status === "LoadingFirstPage" && listProducts.length === 0 ? (
          <Skeleton className="h-10 w-full" />
        ) : listProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products found</p>
        ) : (
          listProducts.map((product) => {
            const imageUrl = getPrimaryImageUrl(product, "");
            const isSelected = value === product._id;
            return (
              <button
                key={product._id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(product._id, product.name)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                  isSelected && "bg-muted ring-1 ring-primary"
                )}
              >
                <div className="relative size-8 shrink-0 overflow-hidden rounded border">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : null}
                </div>
                <span className="min-w-0 flex-1 truncate">{product.name}</span>
                {isSelected ? (
                  <Check className="size-4 shrink-0 text-primary" />
                ) : null}
              </button>
            );
          })
        )}
        {status === "CanLoadMore" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => loadMore(8)}
          >
            Load more
          </Button>
        ) : null}
      </div>
      {error && !hideLabel ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { PromoProduct } from "./product-promo-preview";

type ProductPickerProps = {
  selectedIds: Id<"products">[];
  onChange: (ids: Id<"products">[], products: PromoProduct[]) => void;
  categorySlug?: string;
  minDiscountPercent?: number;
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function ProductPicker({
  selectedIds,
  onChange,
  categorySlug,
  minDiscountPercent,
}: ProductPickerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { results, status, loadMore } = usePaginatedQuery(
    api.products.listDiscountedPaginated,
    {
      search: search || undefined,
      categorySlug: categorySlug || undefined,
      minDiscountPercent,
    },
    { initialNumItems: 10 }
  );

  const toPromo = (product: (typeof results)[number]): PromoProduct => ({
    _id: product._id,
    name: product.name,
    imageUrl: product.imageUrl,
    price: product.price,
    discountedPrice: product.discountedPrice,
    discountPercent: product.discountPercent,
    currency: product.currency,
  });

  const toggle = (product: (typeof results)[number]) => {
    const exists = selectedIds.includes(product._id);
    const nextIds = exists
      ? selectedIds.filter((id) => id !== product._id)
      : [...selectedIds, product._id];

    const productMap = new Map<string, PromoProduct>();
    for (const id of nextIds) {
      const fromResults = results.find((p) => p._id === id);
      if (fromResults) {
        productMap.set(id, toPromo(fromResults));
      }
    }

    onChange(nextIds, Array.from(productMap.values()));
  };

  return (
    <div className="space-y-4">
      <Input
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search discounted products..."
      />
      <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border p-2">
        {status === "LoadingFirstPage" ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))
        ) : results.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No discounted products found.
          </p>
        ) : (
          results.map((product) => {
            const checked = selectedIds.includes(product._id);
            return (
              <label
                key={product._id}
                className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/50"
              >
                <Checkbox checked={checked} onCheckedChange={() => toggle(product)} />
                <div className="relative size-12 shrink-0 overflow-hidden rounded bg-muted">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="destructive">{product.discountPercent}% OFF</Badge>
                    <span className="text-muted-foreground line-through">
                      {formatMoney(product.price, product.currency)}
                    </span>
                    <span className="font-semibold">
                      {formatMoney(product.discountedPrice, product.currency)}
                    </span>
                  </div>
                </div>
              </label>
            );
          })
        )}
        {status === "CanLoadMore" ? (
          <button
            type="button"
            className="w-full py-2 text-center text-sm text-primary"
            onClick={() => loadMore(10)}
          >
            Load more
          </button>
        ) : null}
      </div>
    </div>
  );
}

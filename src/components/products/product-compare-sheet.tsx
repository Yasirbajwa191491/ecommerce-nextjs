"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProductRatingDisplay } from "@/components/reviews/product-rating-display";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyAmount } from "@/lib/currencies";
import { productPath } from "@/lib/product-url";
import type { CompareProductSummary } from "@/lib/vapi-ui-actions/types";
import { SHOP_BODY_SM } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

type ProductCompareSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: CompareProductSummary[];
};

function pickBestLabel(products: CompareProductSummary[]) {
  if (products.length < 2) return null;
  const lowest = [...products].sort((a, b) => a.finalPrice - b.finalPrice)[0];
  const highestRated = [...products].sort(
    (a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount
  )[0];
  const inStock = products.filter((p) => p.inStock);
  return {
    bestValue: lowest,
    bestRated: highestRated,
    bestAvailable: inStock.length === 1 ? inStock[0] : null,
  };
}

export function ProductCompareSheet({
  open,
  onOpenChange,
  products,
}: ProductCompareSheetProps) {
  if (!products.length) return null;

  const picks = pickBestLabel(products);
  const rows: Array<{
    label: string;
    render: (product: CompareProductSummary) => React.ReactNode;
  }> = [
    {
      label: "Price",
      render: (p) => (
        <span className="font-semibold tabular-nums">
          {formatCurrencyAmount(p.finalPrice, p.currency)}
        </span>
      ),
    },
    {
      label: "Rating",
      render: (p) => (
        <ProductRatingDisplay
          rating={p.rating}
          reviewCount={p.reviewsCount}
          size="sm"
          compact
        />
      ),
    },
    {
      label: "Availability",
      render: (p) => (
        <Badge variant={p.inStock ? "secondary" : "outline"}>
          {p.inStock ? "In stock" : "Out of stock"}
        </Badge>
      ),
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Compare products</SheetTitle>
          <SheetDescription>
            Side-by-side comparison of selected products
          </SheetDescription>
        </SheetHeader>

        {picks ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {picks.bestValue ? (
              <Badge className="gap-1 bg-brand-primary/10 text-brand-primary">
                <Sparkles className="size-3" />
                Best value: {picks.bestValue.name}
              </Badge>
            ) : null}
            {picks.bestRated && picks.bestRated.id !== picks.bestValue?.id ? (
              <Badge variant="secondary" className="gap-1">
                Best rated: {picks.bestRated.name}
              </Badge>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="p-3 text-left font-medium text-muted-foreground" />
                {products.map((product) => (
                  <th key={product.id} className="p-3 text-left align-top">
                    <Link
                      href={product.url ?? productPath(product.id)}
                      className="font-semibold hover:text-brand-primary"
                    >
                      {product.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-border/60">
                  <td className={cn("p-3 font-medium text-muted-foreground", SHOP_BODY_SM)}>
                    {row.label}
                  </td>
                  {products.map((product) => (
                    <td key={`${row.label}-${product.id}`} className="p-3">
                      {row.render(product)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProductRatingDisplay } from "@/components/reviews/product-rating-display";
import { formatCurrencyAmount } from "@/lib/currencies";
import { productPath } from "@/lib/product-url";
import type { CompareProductSummary } from "@/lib/vapi-ui-actions/types";

type ProductCompareSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: CompareProductSummary[];
};

export function ProductCompareSheet({
  open,
  onOpenChange,
  products,
}: ProductCompareSheetProps) {
  if (!products.length) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Compare products</SheetTitle>
          <SheetDescription>
            AI-selected products for your request
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="rounded-xl border border-border/60 bg-card p-4 shadow-sm"
            >
              <Link
                href={product.url ?? productPath(product.id)}
                className="font-medium text-sm hover:text-primary"
              >
                {product.name}
              </Link>
              <p className="mt-2 text-lg font-semibold">
                {formatCurrencyAmount(product.finalPrice, product.currency)}
              </p>
              <div className="mt-2">
                <ProductRatingDisplay
                  rating={product.rating}
                  reviewCount={product.reviewsCount}
                  size="sm"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {product.inStock ? "In stock" : "Out of stock"}
              </p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

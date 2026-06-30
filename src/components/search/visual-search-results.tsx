"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import ProductCard from "@/components/products/ProductCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { VisualSearchProduct } from "@/hooks/use-visual-product-search";
import { mapHybridSearchProductsToCatalog } from "@/lib/map-hybrid-search-product";

type VisualSearchResultsProps = {
  products: VisualSearchProduct[];
  totalCount: number;
  isLoading: boolean;
  errorMessage?: string;
  fallbackUsed?: string;
  hasSearched: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
};

export function VisualSearchResults({
  products,
  totalCount,
  isLoading,
  errorMessage,
  fallbackUsed,
  hasSearched,
  onLoadMore,
  hasMore,
}: VisualSearchResultsProps) {
  if (!hasSearched && !isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Upload a photo to find visually similar products in our catalog.
      </p>
    );
  }

  if (isLoading && products.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (errorMessage && products.length === 0) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>Visual search unavailable</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/products"
            className="inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium"
          >
            Browse products
          </Link>
          <Link
            href="/products?search="
            className="inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium"
          >
            Keyword search
          </Link>
        </div>
      </div>
    );
  }

  if (hasSearched && products.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">
          No similar products found. Try a different image or use text search.
        </p>
        <Link
          href="/products"
          className="inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium"
        >
          Browse all products
        </Link>
      </div>
    );
  }

  const catalogProducts = mapHybridSearchProductsToCatalog(products);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {totalCount} similar {totalCount === 1 ? "product" : "products"}
          {fallbackUsed ? ` (via ${fallbackUsed.replace(/_/g, " ")})` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {catalogProducts.map((product) => (
          <ProductCard key={product._id} {...product} />
        ))}
      </div>

      {hasMore && onLoadMore ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={isLoading}>
            {isLoading ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { AlertCircle, PackageSearch } from "lucide-react";
import ProductCard from "@/components/products/ProductCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { VisualSearchProduct } from "@/hooks/use-visual-product-search";
import { mapHybridSearchProductsToCatalog } from "@/lib/map-hybrid-search-product";
import { OUTLINE_BUTTON_CLASS } from "@/lib/layout-constants";
import { SHOP_BODY_SM, SHOP_SUBSECTION_TITLE } from "@/lib/typography";

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
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
        <PackageSearch className="size-10 text-muted-foreground/70" />
        <p className={SHOP_BODY_SM}>
          Your similar products will appear here after you search.
        </p>
      </div>
    );
  }

  if (isLoading && products.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
          ))}
        </div>
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
          <ButtonLink href="/products" variant="outline" className={OUTLINE_BUTTON_CLASS}>
            Browse products
          </ButtonLink>
          <ButtonLink href="/products?search=" variant="outline" className={OUTLINE_BUTTON_CLASS}>
            Keyword search
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (hasSearched && products.length === 0) {
    return (
      <div className="space-y-4 rounded-xl border border-border/80 bg-background p-8 text-center shadow-sm">
        <p className="text-muted-foreground">
          No similar products found. Try a different image or add text keywords.
        </p>
        <ButtonLink href="/products" variant="outline" className={OUTLINE_BUTTON_CLASS}>
          Browse all products
        </ButtonLink>
      </div>
    );
  }

  const catalogProducts = mapHybridSearchProductsToCatalog(products);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className={SHOP_SUBSECTION_TITLE}>Similar products</h2>
        <Badge variant="secondary" className="font-normal">
          {totalCount} {totalCount === 1 ? "match" : "matches"}
        </Badge>
        {fallbackUsed ? (
          <Badge variant="outline" className="font-normal capitalize">
            via {fallbackUsed.replace(/_/g, " ")}
          </Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {catalogProducts.map((product) => (
          <ProductCard key={product._id} {...product} />
        ))}
      </div>

      {hasMore && onLoadMore ? (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            className={OUTLINE_BUTTON_CLASS}
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

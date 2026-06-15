"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, Loader2, Search, Sparkles, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductDiscountBadge } from "@/components/products/product-discount-badge";
import { ProductStars } from "@/components/products/product-stars";
import { formatCurrencyAmount } from "@/lib/currencies";
import { productPath } from "@/lib/product-url";
import type { HybridSearchProduct } from "@/hooks/use-hybrid-product-search";
import { cn } from "@/lib/utils";

type SearchSuggestion = {
  label: string;
  query: string;
  type: "trending" | "curated" | "category";
};

type HeaderSearchDropdownProps = {
  debouncedQuery: string;
  loading: boolean;
  products: HybridSearchProduct[];
  isSimilarFallback: boolean;
  recentSearches: string[];
  suggestions: SearchSuggestion[] | undefined;
  suggestionsLoading: boolean;
  showEmptySuggestions: boolean;
  onSelectQuery: (query: string) => void;
  onClose: () => void;
  viewAllHref: string;
};

function SuggestionIcon({ type }: { type: SearchSuggestion["type"] }) {
  if (type === "trending") {
    return <TrendingUp className="size-3.5 shrink-0 text-[#6254f3]" />;
  }
  if (type === "curated") {
    return <Sparkles className="size-3.5 shrink-0 text-amber-500" />;
  }
  return <Search className="size-3.5 shrink-0 text-muted-foreground" />;
}

function SearchResultRow({
  item,
  onClose,
  onSelectQuery,
}: {
  item: HybridSearchProduct;
  onClose: () => void;
  onSelectQuery: (query: string) => void;
}) {
  return (
    <li>
      <Link
        href={productPath(item._id)}
        role="option"
        onClick={() => {
          onSelectQuery(item.name);
          onClose();
        }}
        className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/60"
      >
        <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt=""
              fill
              sizes="44px"
              className="object-cover object-center"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {item.name}
            </p>
            <ProductDiscountBadge discountPercent={item.discountPercent} />
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {item.categoryName} · {item.company}
          </p>
          {item.reviews > 0 ? (
            <ProductStars rating={item.stars} className="mt-1" />
          ) : null}
        </div>
        <span className="shrink-0 text-sm font-semibold text-[#6254f3]">
          {formatCurrencyAmount(item.finalPrice, item.currency)}
        </span>
      </Link>
    </li>
  );
}

export function HeaderSearchDropdown({
  debouncedQuery,
  loading,
  products,
  isSimilarFallback,
  recentSearches,
  suggestions,
  suggestionsLoading,
  showEmptySuggestions,
  onSelectQuery,
  onClose,
  viewAllHref,
}: HeaderSearchDropdownProps) {
  if (showEmptySuggestions) {
    return (
      <div
        id="search-suggestions"
        role="listbox"
        className="absolute top-[calc(100%+0.5rem)] z-50 w-full overflow-hidden rounded-2xl border border-border/80 bg-background shadow-xl"
      >
        {recentSearches.length > 0 ? (
          <div className="border-b border-border/60 px-3 py-2">
            <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recent searches
            </p>
            <ul>
              {recentSearches.map((term) => (
                <li key={term}>
                  <button
                    type="button"
                    role="option"
                    onClick={() => onSelectQuery(term)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted/60"
                  >
                    <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                    {term}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="px-3 py-2">
          <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Suggested searches
          </p>
          {suggestionsLoading ? (
            <div className="space-y-2 px-1 py-1">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ) : (
            <ul>
              {(suggestions ?? []).map((item) => (
                <li key={`${item.type}-${item.query}`}>
                  <button
                    type="button"
                    role="option"
                    onClick={() => onSelectQuery(item.query)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted/60"
                  >
                    <SuggestionIcon type={item.type} />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      id="search-suggestions"
      role="listbox"
      className="absolute top-[calc(100%+0.5rem)] z-50 w-full overflow-hidden rounded-2xl border border-border/80 bg-background shadow-xl"
    >
      {loading && products.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-[#6254f3]" />
          Searching…
        </div>
      ) : products.length === 0 && !loading ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          No products found for &ldquo;{debouncedQuery.trim()}&rdquo;
        </p>
      ) : (
        <>
          {isSimilarFallback ? (
            <p className="border-b border-border/60 px-4 py-2.5 text-xs text-muted-foreground">
              You may be interested in these similar products.
            </p>
          ) : null}
          <ul className="max-h-80 overflow-y-auto py-1">
            {products.map((item) => (
              <SearchResultRow
                key={item._id}
                item={item}
                onClose={onClose}
                onSelectQuery={onSelectQuery}
              />
            ))}
          </ul>
        </>
      )}

      {loading && products.length > 0 ? (
        <div className="flex items-center justify-center gap-2 border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Updating results…
        </div>
      ) : null}

      <Link
        href={viewAllHref}
        onClick={onClose}
        className={cn(
          "block border-t border-border/60 px-4 py-2.5 text-center text-sm font-medium text-[#6254f3] hover:bg-muted/40"
        )}
      >
        View all results for &ldquo;{debouncedQuery.trim()}&rdquo;
      </Link>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";
import { Clock, Loader2, Search, Sparkles, TrendingUp } from "lucide-react";
import { MotionSkeleton } from "@/components/motion";
import { ProductDiscountBadge } from "@/components/products/product-discount-badge";
import { ProductStars } from "@/components/products/product-stars";
import { formatCurrencyAmount } from "@/lib/currencies";
import { productPath } from "@/lib/product-url";
import type { HybridSearchProduct } from "@/hooks/use-hybrid-product-search";
import { dropdown, staggerContainer, staggerItem } from "@/lib/motion";
import { SHOP_BODY_SM, SHOP_META_LABEL } from "@/lib/typography";
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

function DropdownShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <m.div
      id="search-suggestions"
      role="listbox"
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      exit={reduceMotion ? undefined : "exit"}
      variants={dropdown}
      className={cn(
        "absolute top-[calc(100%+0.5rem)] z-50 w-full min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-background shadow-xl",
        "max-lg:left-0 max-lg:right-0",
        className
      )}
    >
      {children}
    </m.div>
  );
}

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
  const reduceMotion = useReducedMotion();

  const content = (
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
        <p className="truncate text-sm text-muted-foreground">
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
  );

  if (reduceMotion) {
    return <li>{content}</li>;
  }

  return (
    <m.li variants={staggerItem} layout={false}>
      {content}
    </m.li>
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
  const reduceMotion = useReducedMotion();

  if (showEmptySuggestions) {
    return (
      <DropdownShell>
        {recentSearches.length > 0 ? (
          <div className="border-b border-border/60 px-3 py-2">
            <p className={cn("px-1 pb-1", SHOP_META_LABEL)}>
              Recent searches
            </p>
            <m.ul
              initial={reduceMotion ? false : "hidden"}
              animate="visible"
              variants={staggerContainer(0.04)}
            >
              {recentSearches.map((term) => (
                <m.li key={term} variants={staggerItem}>
                  <button
                    type="button"
                    role="option"
                    onClick={() => onSelectQuery(term)}
                    className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted/60"
                  >
                    <Clock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 break-words">{term}</span>
                  </button>
                </m.li>
              ))}
            </m.ul>
          </div>
        ) : null}

        <div className="px-3 py-2">
          <p className={cn("px-1 pb-1", SHOP_META_LABEL)}>
            Suggested searches
          </p>
          {suggestionsLoading ? (
            <div className="space-y-2 px-1 py-1">
              <MotionSkeleton shimmer className="h-8 w-full rounded-lg" />
              <MotionSkeleton shimmer className="h-8 w-full rounded-lg" />
              <MotionSkeleton shimmer className="h-8 w-full rounded-lg" />
            </div>
          ) : (
            <m.ul
              initial={reduceMotion ? false : "hidden"}
              animate="visible"
              variants={staggerContainer(0.04)}
            >
              {(suggestions ?? []).map((item) => (
                <m.li key={`${item.type}-${item.query}`} variants={staggerItem}>
                  <button
                    type="button"
                    role="option"
                    onClick={() => onSelectQuery(item.query)}
                    className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted/60"
                  >
                    <SuggestionIcon type={item.type} />
                    <span className="min-w-0 flex-1 break-words">{item.label}</span>
                  </button>
                </m.li>
              ))}
            </m.ul>
          )}
        </div>
      </DropdownShell>
    );
  }

  return (
    <DropdownShell>
      {loading && products.length === 0 ? (
        <div className="space-y-2 px-3 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-[#6254f3]" />
            Searching…
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <MotionSkeleton key={i} shimmer className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : products.length === 0 && !loading ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          No products found for &ldquo;{debouncedQuery.trim()}&rdquo;
        </p>
      ) : (
        <>
          {isSimilarFallback ? (
            <p className={cn("border-b border-border/60 px-4 py-2.5", SHOP_BODY_SM)}>
              You may be interested in these similar products.
            </p>
          ) : null}
          <m.ul
            className="max-h-80 overflow-y-auto py-1"
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            variants={staggerContainer(0.05)}
          >
            {products.map((item) => (
              <SearchResultRow
                key={item._id}
                item={item}
                onClose={onClose}
                onSelectQuery={onSelectQuery}
              />
            ))}
          </m.ul>
        </>
      )}

      {loading && products.length > 0 ? (
        <div className={cn("flex items-center justify-center gap-2 border-t border-border/60 px-4 py-2", SHOP_BODY_SM)}>
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
    </DropdownShell>
  );
}

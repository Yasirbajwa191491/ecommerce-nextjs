"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { Search } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { productPath } from "@/lib/product-url";
import { formatCurrencyAmount } from "@/lib/currencies";
import { calculateFinalPrice } from "@/lib/pricing";
import {
  buildProductsSearchPath,
  markSearchUrlSynced,
  resetSearchUrlSync,
  syncSearchUrl,
} from "@/lib/shop/sync-search-url";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;

type HeaderSearchProps = {
  className?: string;
  inputPadding?: "default" | "comfortable";
};

function HeaderSearchForm({
  className,
  inputPadding = "default",
  initialQuery = "",
}: HeaderSearchProps & { initialQuery?: string }) {
  const [query, setQuery] = useState("");
  const [hasEdited, setHasEdited] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputValue = hasEdited ? query : initialQuery;
  const debouncedQuery = useDebouncedValue(inputValue, SEARCH_DEBOUNCE_MS);
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchTerm = useSearchParams().get("search") ?? "";

  const suggestions = useQuery(
    api.products.searchSuggestions,
    debouncedQuery.trim().length >= 2
      ? { query: debouncedQuery.trim(), limit: 6 }
      : "skip"
  );

  useEffect(() => {
    if (pathname !== "/products") {
      resetSearchUrlSync();
      return;
    }
    markSearchUrlSynced(buildProductsSearchPath(urlSearchTerm));
  }, [pathname, urlSearchTerm]);

  useEffect(() => {
    if (!hasEdited || pathname !== "/products") return;

    const term = debouncedQuery.trim();
    const targetPath = buildProductsSearchPath(term);
    if (term === urlSearchTerm) {
      markSearchUrlSynced(targetPath);
      return;
    }

    syncSearchUrl(targetPath, pathname, router);
  }, [debouncedQuery, hasEdited, pathname, router, urlSearchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasEdited(true);
    setDropdownOpen(false);
    const targetPath = buildProductsSearchPath(inputValue);

    if (pathname !== "/products") {
      router.push(targetPath);
      return;
    }

    syncSearchUrl(targetPath, pathname, router);
  };

  const inputStyle =
    inputPadding === "comfortable"
      ? { paddingLeft: "1.75rem", paddingRight: "1rem" }
      : { paddingLeft: "1.5rem", paddingRight: "1rem" };

  const showDropdown =
    dropdownOpen &&
    debouncedQuery.trim().length >= 2 &&
    suggestions !== undefined;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form
        onSubmit={handleSubmit}
        role="search"
        className="w-full"
      >
        <div className="flex h-10 items-stretch overflow-hidden rounded-full border border-border/80 bg-background shadow-sm transition-shadow focus-within:border-[#6254f3]/40 focus-within:shadow-md sm:h-11">
          <Input
            type="search"
            value={inputValue}
            onChange={(e) => {
              setHasEdited(true);
              setQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Search products, brands, categories…"
            aria-label="Search products"
            aria-expanded={showDropdown}
            aria-controls="search-suggestions"
            autoComplete="off"
            className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent py-0 text-sm shadow-none focus-visible:ring-0"
            style={inputStyle}
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 rounded-none border-l border-border/80 text-muted-foreground hover:bg-[#6254f3]/5 hover:text-[#6254f3] sm:size-11"
            aria-label="Search"
          >
            <Search className="size-[1.125rem]" />
          </Button>
        </div>
      </form>

      {showDropdown ? (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute top-[calc(100%+0.5rem)] z-50 w-full overflow-hidden rounded-2xl border border-border/80 bg-background shadow-xl"
        >
          {suggestions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No products found for &ldquo;{debouncedQuery.trim()}&rdquo;
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {suggestions.map((item) => {
                const finalPrice = calculateFinalPrice(
                  item.price,
                  item.discountPercent
                );
                return (
                  <li key={item._id}>
                    <Link
                      href={productPath(item._id)}
                      role="option"
                      onClick={() => setDropdownOpen(false)}
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
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.categoryName} · {item.company}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-[#6254f3]">
                        {formatCurrencyAmount(finalPrice, item.currency)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href={buildProductsSearchPath(debouncedQuery.trim())}
            onClick={() => setDropdownOpen(false)}
            className="block border-t border-border/60 px-4 py-2.5 text-center text-sm font-medium text-[#6254f3] hover:bg-muted/40"
          >
            View all results for &ldquo;{debouncedQuery.trim()}&rdquo;
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function HeaderSearchWithParams(props: HeaderSearchProps) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("search") ?? "";
  return <HeaderSearchForm {...props} initialQuery={initialQuery} />;
}

export function HeaderSearchFallback({ className }: HeaderSearchProps) {
  return (
    <Skeleton
      className={cn("h-10 w-full max-w-2xl rounded-full sm:h-11", className)}
    />
  );
}

export function HeaderSearch(props: HeaderSearchProps) {
  return (
    <Suspense fallback={<HeaderSearchFallback className={props.className} />}>
      <HeaderSearchWithParams {...props} />
    </Suspense>
  );
}

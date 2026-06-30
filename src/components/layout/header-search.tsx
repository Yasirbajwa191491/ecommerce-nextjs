"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { AnimatePresence } from "framer-motion";
import { Loader2, Search, ImageIcon } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSearchDropdown } from "@/components/layout/header-search-dropdown";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useHybridProductSearch } from "@/hooks/use-hybrid-product-search";
import {
  addRecentSearch,
  getRecentSearches,
} from "@/lib/search/recent-searches";
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
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputValue = hasEdited ? query : initialQuery;
  const debouncedQuery = useDebouncedValue(inputValue, SEARCH_DEBOUNCE_MS);
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchTerm = useSearchParams().get("search") ?? "";

  const trimmedDebounced = debouncedQuery.trim();
  const showSearchResults = trimmedDebounced.length >= 2;
  const showEmptySuggestions = dropdownOpen && !showSearchResults;

  const refreshRecentSearches = () => {
    setRecentSearches(getRecentSearches());
  };

  const { products, loading, isSimilarFallback } = useHybridProductSearch({
    debouncedQuery,
    limit: 8,
    source: "header",
    enabled: showSearchResults,
  });

  const suggestions = useQuery(
    api.productSearchQueries.getSearchSuggestions,
    showEmptySuggestions ? {} : "skip"
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

  const saveAndNavigate = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    addRecentSearch(trimmed);
    refreshRecentSearches();
    setDropdownOpen(false);
    const targetPath = buildProductsSearchPath(trimmed);
    if (pathname !== "/products") {
      router.push(targetPath);
      return;
    }
    syncSearchUrl(targetPath, pathname, router);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasEdited(true);
    saveAndNavigate(inputValue);
  };

  const handleSelectQuery = (term: string) => {
    setHasEdited(true);
    setQuery(term);
    saveAndNavigate(term);
  };

  const inputStyle =
    inputPadding === "comfortable"
      ? { paddingLeft: "1.75rem", paddingRight: "1rem" }
      : { paddingLeft: "1.5rem", paddingRight: "1rem" };

  const showDropdown =
    dropdownOpen && (showSearchResults || showEmptySuggestions);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form onSubmit={handleSubmit} role="search" className="w-full">
        <div className="flex h-10 items-stretch overflow-hidden rounded-full border border-border/80 bg-background shadow-sm transition-shadow focus-within:border-[#6254f3]/40 focus-within:shadow-md sm:h-11">
          <Input
            type="search"
            value={inputValue}
            onChange={(e) => {
              setHasEdited(true);
              setQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => {
              setDropdownOpen(true);
              refreshRecentSearches();
            }}
            placeholder="Search products, brands, categories…"
            aria-label="Search products"
            aria-expanded={showDropdown}
            aria-controls="search-suggestions"
            autoComplete="off"
            className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent py-0 text-sm shadow-none focus-visible:ring-0"
            style={inputStyle}
          />
          <Link
            href="/products/visual-search"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-none border-l border-border/80 text-muted-foreground hover:bg-[#6254f3]/5 hover:text-[#6254f3] sm:size-11"
            aria-label="Search by image"
          >
            <ImageIcon className="size-[1.125rem]" />
          </Link>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 rounded-none border-l border-border/80 text-muted-foreground hover:bg-[#6254f3]/5 hover:text-[#6254f3] sm:size-11"
            aria-label="Search"
          >
            {loading && showSearchResults ? (
              <Loader2 className="size-[1.125rem] animate-spin" />
            ) : (
              <Search className="size-[1.125rem]" />
            )}
          </Button>
        </div>
      </form>

      <AnimatePresence>
        {showDropdown ? (
          <HeaderSearchDropdown
            key={showEmptySuggestions ? "suggestions" : trimmedDebounced || "search"}
            debouncedQuery={debouncedQuery}
            loading={loading}
            products={products}
            isSimilarFallback={isSimilarFallback}
            recentSearches={recentSearches}
            suggestions={suggestions}
            suggestionsLoading={suggestions === undefined && showEmptySuggestions}
            showEmptySuggestions={showEmptySuggestions}
            onSelectQuery={handleSelectQuery}
            onClose={() => setDropdownOpen(false)}
            viewAllHref={buildProductsSearchPath(trimmedDebounced)}
          />
        ) : null}
      </AnimatePresence>
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

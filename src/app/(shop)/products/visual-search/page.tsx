"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { VisualSearchUpload } from "@/components/search/visual-search-upload";
import { VisualSearchResults } from "@/components/search/visual-search-results";
import { useVisualProductSearch } from "@/hooks/use-visual-product-search";
import { getSearchSessionId } from "@/lib/search/recent-searches";
import { parseCatalogFilters } from "@/lib/shop/catalog-filter-url";
import { Button } from "@/components/ui/button";

function VisualSearchPageContent() {
  const searchParams = useSearchParams();
  const catalogFilters = parseCatalogFilters(searchParams);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [lastTextQuery, setLastTextQuery] = useState<string | undefined>();
  const {
    products,
    totalCount,
    nextCursor,
    isLoading,
    errorMessage,
    fallbackUsed,
    previewUrl,
    search,
  } = useVisualProductSearch();

  const runSearch = async (file: File, textQuery?: string, cursor?: number) => {
    setHasSearched(true);
    if (!cursor) {
      setLastFile(file);
      setLastTextQuery(textQuery);
    }
    await search({
      file,
      textQuery,
      sessionId: getSearchSessionId(),
      categorySlug: catalogFilters.categorySlug || undefined,
      brandSlugs: catalogFilters.brandSlugs.length
        ? catalogFilters.brandSlugs
        : undefined,
      minPrice: catalogFilters.minPrice,
      maxPrice: catalogFilters.maxPrice,
      minRating: catalogFilters.minRating,
      cursor,
      append: cursor != null && cursor > 0,
    });
  };

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/products"
            className="inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
            Back to products
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Search by image
            </h1>
            <p className="text-sm text-muted-foreground">
              Find visually similar products. Combine with text to refine results.
            </p>
          </div>
        </div>

        <VisualSearchUpload
          onSearch={(file, textQuery) => void runSearch(file, textQuery)}
          isLoading={isLoading}
          previewUrl={previewUrl}
        />

        <VisualSearchResults
          products={products}
          totalCount={totalCount}
          isLoading={isLoading}
          errorMessage={errorMessage}
          fallbackUsed={fallbackUsed}
          hasSearched={hasSearched}
          hasMore={nextCursor != null}
          onLoadMore={
            lastFile
              ? () => void runSearch(lastFile, lastTextQuery, nextCursor)
              : undefined
          }
        />
      </div>
    </div>
  );
}

export default function VisualSearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted/20" />}>
      <VisualSearchPageContent />
    </Suspense>
  );
}

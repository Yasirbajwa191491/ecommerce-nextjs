"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Camera } from "lucide-react";
import { VisualSearchUpload } from "@/components/search/visual-search-upload";
import { VisualSearchResults } from "@/components/search/visual-search-results";
import { useVisualProductSearch } from "@/hooks/use-visual-product-search";
import { getSearchSessionId } from "@/lib/search/recent-searches";
import { parseCatalogFilters } from "@/lib/shop/catalog-filter-url";
import {
  CONTENT_SECTION_PADDING_Y,
  PAGE_GUTTER,
  PAGE_HEADER_PADDING_Y,
} from "@/lib/layout-constants";
import { SHOP_PAGE_LEAD, SHOP_PAGE_TITLE } from "@/lib/typography";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
    search,
    reset,
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

  const handleClear = () => {
    reset();
    setHasSearched(false);
    setLastFile(null);
    setLastTextQuery(undefined);
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div
        className={cn(CONTENT_SECTION_PADDING_Y, "mx-auto max-w-5xl")}
        style={PAGE_GUTTER}
      >
        <header className={cn(PAGE_HEADER_PADDING_Y, "space-y-4")}>
          <Link
            href="/products"
            className="inline-flex h-8 items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to products
          </Link>

          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#6254f3]/10 text-[#6254f3]">
              <Camera className="size-5" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className={SHOP_PAGE_TITLE}>Search by image</h1>
              <p className={SHOP_PAGE_LEAD}>
                Find visually similar products. Upload a photo or use your camera,
                then optionally add text to refine results.
              </p>
            </div>
          </div>
        </header>

        <VisualSearchUpload
          onSearch={(file, textQuery) => void runSearch(file, textQuery)}
          onClear={handleClear}
          isLoading={isLoading}
        />

        <Separator className="my-8" />

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

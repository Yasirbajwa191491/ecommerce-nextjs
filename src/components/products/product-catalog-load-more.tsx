"use client";

import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ProductCatalogLoadMoreProps = {
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadedCount: number;
  view: "grid" | "list";
};

export function ProductCatalogLoadMore({
  sentinelRef,
  isLoadingMore,
  hasMore,
  loadedCount,
  view,
}: ProductCatalogLoadMoreProps) {
  return (
    <div ref={sentinelRef} className="mt-6 min-h-px w-full">
      {isLoadingMore ? (
        <div
          className={cn(
            "grid",
            view === "grid"
              ? "grid-cols-1 gap-1 sm:gap-1.5 md:grid-cols-2 2xl:grid-cols-3"
              : "flex flex-col gap-3 sm:gap-4"
          )}
        >
          {Array.from({ length: view === "grid" ? 3 : 2 }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn(
                "rounded-2xl",
                view === "list" ? "h-32" : "h-[22rem]"
              )}
            />
          ))}
        </div>
      ) : null}

      {!hasMore && loadedCount > 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Showing all {loadedCount}{" "}
          {loadedCount === 1 ? "product" : "products"}
        </p>
      ) : null}

      {hasMore && isLoadingMore ? (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-[#6254f3]" />
          <span>Loading more products…</span>
        </div>
      ) : null}
    </div>
  );
}

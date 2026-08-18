"use client";

import { Loader2 } from "lucide-react";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

type AdminTableInfiniteScrollProps = {
  enabled: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
};

export function AdminTableInfiniteScroll({
  enabled,
  isLoadingMore,
  onLoadMore,
}: AdminTableInfiniteScrollProps) {
  const sentinelRef = useInfiniteScroll({
    enabled,
    onLoadMore,
    rootMargin: "240px",
  });

  return (
    <div ref={sentinelRef} className="mt-4 flex min-h-8 items-center justify-center">
      {isLoadingMore ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-[#6254f3]" />
          <span>Loading more…</span>
        </div>
      ) : null}
    </div>
  );
}

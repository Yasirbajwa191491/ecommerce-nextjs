"use client";

import { useEffect, useRef } from "react";

type UseInfiniteScrollOptions = {
  enabled: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
};

export function useInfiniteScroll({
  enabled,
  onLoadMore,
  rootMargin = "320px",
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    if (!enabled) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMoreRef.current();
        }
      },
      { root: null, rootMargin, threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return sentinelRef;
}

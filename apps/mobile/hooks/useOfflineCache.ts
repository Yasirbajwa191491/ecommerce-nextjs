import { useEffect, useState } from "react";

import { cacheProducts } from "@/lib/offline/product-store";
import { readCache, writeCache } from "@/lib/offline/storage";
import type { Product } from "@/types/product";

type OfflineCacheResult<T> = {
  data: T | undefined;
  fromCache: boolean;
  cachedAt: number | null;
  ready: boolean;
};

function isProductArray(value: unknown): value is Product[] {
  return Array.isArray(value) && value.every((item) => item && typeof item === "object" && "_id" in item);
}

function isProduct(value: unknown): value is Product {
  return Boolean(value) && typeof value === "object" && "_id" in (value as object);
}

export function useOfflineCache<T>(
  key: string,
  live: T | undefined | null,
  persistNull = false
): OfflineCacheResult<T> {
  const [cached, setCached] = useState<{ data: T; cachedAt: number } | null>(null);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const ready = readyKey === key;

  useEffect(() => {
    let cancelled = false;
    void readCache<T>(key).then((entry) => {
      if (cancelled) return;
      setCached(entry ? { data: entry.data, cachedAt: entry.cachedAt } : null);
      setReadyKey(key);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (live === undefined) return;
    if (live === null && !persistNull) return;

    void writeCache(key, live).then((cachedAt) => {
      setCached({ data: live as T, cachedAt });
    });

    if (isProductArray(live)) {
      void cacheProducts(live);
    } else if (isProduct(live)) {
      void cacheProducts([live]);
    }
  }, [key, live, persistNull]);

  if (live !== undefined && live !== null) {
    return { data: live, fromCache: false, cachedAt: cached?.cachedAt ?? null, ready: true };
  }

  if (live === null) {
    return { data: undefined, fromCache: false, cachedAt: null, ready: true };
  }

  return {
    data: cached?.data,
    fromCache: Boolean(cached),
    cachedAt: cached?.cachedAt ?? null,
    ready,
  };
}

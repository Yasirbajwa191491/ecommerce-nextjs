import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import type { Product } from "@/types/product";
import {
  getRecentlyViewedProducts,
  getRecentlyViewedRevision,
  hydrateRecentlyViewed,
  recordRecentlyViewed,
  subscribeRecentlyViewed,
} from "@/lib/offline/recently-viewed";
import {
  getProductStoreVersion,
  subscribeProductStore,
} from "@/lib/offline/product-store";

function subscribeBoth(onChange: () => void) {
  const unsubViewed = subscribeRecentlyViewed(onChange);
  const unsubProducts = subscribeProductStore(onChange);
  return () => {
    unsubViewed();
    unsubProducts();
  };
}

function getSnapshot() {
  return `${getRecentlyViewedRevision()}:${getProductStoreVersion()}`;
}

export function useRecentlyViewed() {
  useSyncExternalStore(subscribeBoth, getSnapshot, getSnapshot);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void hydrateRecentlyViewed().then(() => setReady(true));
  }, []);

  const products = getRecentlyViewedProducts();

  const record = useCallback(async (product: Product) => {
    await recordRecentlyViewed(product);
  }, []);

  return { products, ready, record };
}

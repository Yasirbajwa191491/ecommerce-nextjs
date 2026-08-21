import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { getCachedVisitorId } from "@/lib/visitor-id";
import { api } from "@/lib/convex-api";
import { getIsOnline } from "@/lib/network";
import {
  cacheWishlistIds,
  enqueueWishlistChange,
  getCachedWishlistIds,
  getWishlistQueue,
  hydrateWishlistStore,
  mergeWishlistIds,
  subscribeWishlistStore,
} from "@/lib/offline/wishlist-queue";
import type { Id } from "@convex/_generated/dataModel";

export function useWishlist() {
  const visitorId = getCachedVisitorId();
  const wishlistIds = useQuery(
    api.recommendationQueries.listWishlistProductIds,
    visitorId ? { visitorId } : "skip"
  );
  const toggleWishlist = useMutation(api.recommendationMutations.toggleWishlistItem);

  const queue = useSyncExternalStore(
    subscribeWishlistStore,
    getWishlistQueue,
    getWishlistQueue
  );

  useEffect(() => {
    void hydrateWishlistStore();
  }, []);

  useEffect(() => {
    if (wishlistIds === undefined) return;
    void cacheWishlistIds(wishlistIds);
  }, [wishlistIds]);

  const wishlistSet = useMemo(
    () => mergeWishlistIds(wishlistIds, queue),
    [wishlistIds, queue]
  );

  const isWishlisted = useCallback(
    (productId: Id<"products">) => wishlistSet.has(productId),
    [wishlistSet]
  );

  const toggle = useCallback(
    async (productId: Id<"products">) => {
      if (!visitorId) return false;
      const add = !wishlistSet.has(productId);
      await enqueueWishlistChange(productId, add);

      if (!getIsOnline()) {
        return add;
      }

      try {
        return await toggleWishlist({ visitorId, productId, add });
      } catch {
        return add;
      }
    },
    [visitorId, wishlistSet, toggleWishlist]
  );

  return {
    wishlistIds: [...wishlistSet] as Id<"products">[],
    isLoading: wishlistIds === undefined && getCachedWishlistIds().length === 0,
    isWishlisted,
    toggle,
  };
}

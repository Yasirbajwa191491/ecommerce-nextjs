import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo } from "react";

import { getCachedVisitorId } from "@/lib/visitor-id";
import { api } from "@/lib/convex-api";
import type { Id } from "@convex/_generated/dataModel";

export function useWishlist() {
  const visitorId = getCachedVisitorId();
  const wishlistIds = useQuery(
    api.recommendationQueries.listWishlistProductIds,
    visitorId ? { visitorId } : "skip"
  );
  const toggleWishlist = useMutation(api.recommendationMutations.toggleWishlistItem);

  const wishlistSet = useMemo(
    () => new Set(wishlistIds ?? []),
    [wishlistIds]
  );

  const isWishlisted = useCallback(
    (productId: Id<"products">) => wishlistSet.has(productId),
    [wishlistSet]
  );

  const toggle = useCallback(
    async (productId: Id<"products">) => {
      if (!visitorId) return false;
      const add = !wishlistSet.has(productId);
      return toggleWishlist({ visitorId, productId, add });
    },
    [visitorId, wishlistSet, toggleWishlist]
  );

  return {
    wishlistIds: wishlistIds ?? [],
    isLoading: wishlistIds === undefined,
    isWishlisted,
    toggle,
  };
}

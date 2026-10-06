"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getWishlistIds,
  isInWishlist,
  removeWishlistId,
  toggleWishlistId,
} from "@/lib/wishlist-storage";

const WISHLIST_CHANGE_EVENT = "storefront:wishlist-change";

function notifyWishlistChange() {
  window.dispatchEvent(new CustomEvent(WISHLIST_CHANGE_EVENT));
}

export function useWishlist() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIds(getWishlistIds()), 0);
    const handler = () => setIds(getWishlistIds());
    window.addEventListener(WISHLIST_CHANGE_EVENT, handler);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(WISHLIST_CHANGE_EVENT, handler);
    };
  }, []);

  const toggle = useCallback((productId: string) => {
    toggleWishlistId(productId);
    notifyWishlistChange();
    return isInWishlist(productId);
  }, []);

  const remove = useCallback((productId: string) => {
    removeWishlistId(productId);
    notifyWishlistChange();
  }, []);

  const has = useCallback(
    (productId: string) => ids.includes(productId),
    [ids]
  );

  return { ids, toggle, remove, has, count: ids.length };
}

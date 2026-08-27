import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";

import { api } from "@/lib/convex-api";
import { isSnapshotConfirmedOnline } from "@/lib/network";
import {
  drainWishlistQueue,
  dropDeadLetterItems,
  resetWishlistAttempts,
} from "@/lib/offline/wishlist-queue";
import { getVisitorId } from "@/lib/visitor-id";
import { useNetworkStatus } from "@/providers/NetworkProvider";

export function OfflineSyncBridge() {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const toggleWishlist = useMutation(api.recommendationMutations.toggleWishlistItem);
  const previousOnlineRef = useRef<boolean | null>(null);
  const isConfirmedOnline = isSnapshotConfirmedOnline({
    isConnected,
    isInternetReachable,
  });

  useEffect(() => {
    if (!isConfirmedOnline) {
      previousOnlineRef.current = false;
      return;
    }

    const cameOnline = previousOnlineRef.current === false;
    previousOnlineRef.current = true;

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        const visitorId = await getVisitorId();
        if (!visitorId || cancelled) return;
        if (cameOnline) {
          await resetWishlistAttempts();
        }
        await drainWishlistQueue(async (item) => {
          await toggleWishlist({
            visitorId,
            productId: item.productId,
            add: item.add,
          });
        });
        await dropDeadLetterItems();
      })();
    }, cameOnline ? 600 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isConfirmedOnline, toggleWishlist]);

  return null;
}

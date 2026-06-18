"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const TICK_MS = 60_000;

/**
 * Timestamp for promotion/cart date-window queries.
 *
 * Convex reactivity updates when promotion rows change, but active checks use
 * `now >= startAt && now <= endAt`. A frozen clock from first paint hides
 * promotions created after that moment until a full refresh.
 *
 * This hook refreshes `now` on route changes, tab focus, and a slow interval —
 * without passing Date.now() directly in render (that caused re-render loops).
 */
export function useStableNow(): number {
  const pathname = usePathname();
  const [now, setNow] = useState(() => Date.now());

  const syncNow = useCallback(() => {
    setNow(Date.now());
  }, []);

  useEffect(() => {
    syncNow();
  }, [pathname, syncNow]);

  useEffect(() => {
    const onFocus = () => syncNow();
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncNow();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const intervalId = window.setInterval(syncNow, TICK_MS);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(intervalId);
    };
  }, [syncNow]);

  return now;
}

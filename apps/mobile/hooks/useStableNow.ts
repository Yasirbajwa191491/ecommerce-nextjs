import { useEffect, useState } from "react";

/** Stable client timestamp for time-sensitive Convex queries (promotions, facets). */
export function useStableNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

"use client";

import { useEffect, useRef } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { useRecommendationTracking } from "@/hooks/use-recommendation-tracking";

export function ProductViewTracker({
  productId,
}: {
  productId: Id<"products">;
}) {
  const { trackView } = useRecommendationTracking();
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (trackedRef.current === productId) return;
    trackedRef.current = productId;
    void trackView(productId);
  }, [productId, trackView]);

  return null;
}

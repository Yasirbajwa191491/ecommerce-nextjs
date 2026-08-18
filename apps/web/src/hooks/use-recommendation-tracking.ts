"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import {
  getCheckoutCustomerEmail,
  getVisitorId,
} from "@/lib/recommendations/visitor-id";
import type { RecommendationSectionType } from "@/lib/recommendations/section-copy";

export function useRecommendationTracking() {
  const recordBehavior = useMutation(api.recommendationMutations.recordBehaviorEvent);
  const recordInteraction = useMutation(
    api.recommendationMutations.recordRecommendationInteraction
  );

  const trackView = useCallback(
    async (productId: Id<"products">) => {
      const visitorId = getVisitorId();
      if (!visitorId) return;
      await recordBehavior({
        eventType: "view",
        visitorId,
        customerEmail: getCheckoutCustomerEmail(),
        productId,
      });
    },
    [recordBehavior]
  );

  const trackImpression = useCallback(
    async (
      sectionType: RecommendationSectionType,
      productId: Id<"products">,
      cacheKey?: string
    ) => {
      await recordInteraction({
        eventType: "impression",
        sectionType,
        productId,
        visitorId: getVisitorId() || undefined,
        customerKey: getCheckoutCustomerEmail(),
        cacheKey,
      });
    },
    [recordInteraction]
  );

  const trackClick = useCallback(
    async (
      sectionType: RecommendationSectionType,
      productId: Id<"products">,
      cacheKey?: string
    ) => {
      await recordInteraction({
        eventType: "click",
        sectionType,
        productId,
        visitorId: getVisitorId() || undefined,
        customerKey: getCheckoutCustomerEmail(),
        cacheKey,
      });
    },
    [recordInteraction]
  );

  return { trackView, trackImpression, trackClick };
}

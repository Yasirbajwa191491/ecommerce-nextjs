"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import { resolveCartProductId } from "@/lib/cart-lines";
import { useCartContext } from "@/context/cart_context";
import {
  getCheckoutCustomerEmail,
  getVisitorId,
} from "@/lib/recommendations/visitor-id";

export function useCartRecommendationSync() {
  const { cart } = useCartContext();
  const recordBatch = useMutation(
    api.recommendationMutations.recordBehaviorEventsBatch
  );
  const previousRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const visitorId = getVisitorId();
    if (!visitorId) return;

    const current = new Set(
      cart.map((item) => resolveCartProductId(item))
    );
    const added: Id<"products">[] = [];
    const removed: Id<"products">[] = [];

    for (const id of current) {
      if (!previousRef.current.has(id)) {
        added.push(id as Id<"products">);
      }
    }
    for (const id of previousRef.current) {
      if (!current.has(id)) {
        removed.push(id as Id<"products">);
      }
    }

    previousRef.current = current;
    if (added.length === 0 && removed.length === 0) return;

    const events = [
      ...added.map((productId) => ({
        eventType: "cart_add" as const,
        productId,
      })),
      ...removed.map((productId) => ({
        eventType: "cart_remove" as const,
        productId,
      })),
    ];

    void recordBatch({
      visitorId,
      customerEmail: getCheckoutCustomerEmail(),
      events,
    });
  }, [cart, recordBatch]);
}

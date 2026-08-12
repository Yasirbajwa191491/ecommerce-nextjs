"use client";

import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { useQuery } from "convex/react";
import { Sparkles } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ProductCarouselSection } from "@/components/home/product-carousel-section";
import { useCartContext } from "@/context/cart_context";
import { getRecentlyViewedIds } from "@/lib/recently-viewed-storage";
import { resolveCartProductId } from "@/reducer/cartReducer";
import type { Product } from "@/types/product";

export function PersonalizedRecommendationsSection() {
  const { cart } = useCartContext();
  const getSimilar = useAction(api.productSearch.getSimilarProducts);
  const [recommendedIds, setRecommendedIds] = useState<Id<"products">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cartId = cart[0] ? resolveCartProductId(cart[0]) : null;
    const recentId = getRecentlyViewedIds()[0] ?? null;
    const sourceId = (cartId ?? recentId) as Id<"products"> | null;

    if (!sourceId) {
      setRecommendedIds([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void getSimilar({ productId: sourceId, limit: 8 })
      .then((results) => {
        if (!cancelled) {
          setRecommendedIds(
            results
              .map((item) => item._id)
              .filter((id) => id !== sourceId)
              .slice(0, 8)
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cart, getSimilar]);

  const products = useQuery(
    api.products.listByIds,
    recommendedIds.length ? { ids: recommendedIds } : "skip"
  );

  if (loading || !products?.length) return null;

  return (
    <ProductCarouselSection
      badge="For you"
      badgeIcon={Sparkles}
      title="Recommended for You"
      description="Session-based picks from products you've viewed and items in your cart — no sign-in required."
      products={products as Product[]}
      action={{ href: "/products", label: "Explore more" }}
      background="default"
    />
  );
}

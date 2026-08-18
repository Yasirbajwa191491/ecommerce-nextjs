"use client";

import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import ProductCard from "@/components/products/ProductCard";
import { ShopSection } from "@/components/shop/shop-section";
import { MotionSkeleton } from "@/components/motion";
import { useQuery } from "convex/react";
import type { Product } from "@/types/product";

type CartRecommendationsSectionProps = {
  productIds: Id<"products">[];
  className?: string;
};

export function CartRecommendationsSection({
  productIds,
  className,
}: CartRecommendationsSectionProps) {
  const getSimilar = useAction(api.productSearch.getSimilarProducts);
  const [similarIds, setSimilarIds] = useState<Id<"products">[]>([]);
  const [loading, setLoading] = useState(false);

  const sourceId = productIds[0];

  useEffect(() => {
    if (!sourceId) {
      setSimilarIds([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getSimilar({ productId: sourceId, limit: 4 })
      .then((results) => {
        if (!cancelled) {
          setSimilarIds(
            results
              .map((item) => item._id)
              .filter((id) => !productIds.includes(id))
              .slice(0, 4)
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [getSimilar, sourceId, productIds]);

  const products = useQuery(
    api.products.listByIds,
    similarIds.length ? { ids: similarIds } : "skip"
  );

  if (!sourceId) return null;
  if (!loading && (!products || products.length === 0)) return null;

  return (
    <ShopSection
      title="Complete Your Purchase"
      description="Customers who bought these items also considered the following."
      padding="none"
      className={className}
    >
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading || products === undefined
          ? Array.from({ length: 4 }).map((_, i) => (
              <MotionSkeleton key={i} className="h-80 rounded-2xl" />
            ))
          : (products as Product[]).map((product) => (
              <ProductCard key={product._id} {...product} animateEntrance={false} />
            ))}
      </div>
    </ShopSection>
  );
}

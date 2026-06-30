"use client";

import { useEffect, useRef } from "react";
import ProductCard from "@/components/products/ProductCard";
import { productCardKey } from "@/lib/product-images";
import { AnimatedSectionHeader } from "@/components/home/animated-section-header";
import { StaggerGroup, StaggerItem } from "@/components/home/scroll-reveal";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/types/product";
import type { Id } from "../../../convex/_generated/dataModel";
import { useRecommendations } from "@/hooks/use-recommendations";
import { useRecommendationTracking } from "@/hooks/use-recommendation-tracking";
import {
  RECOMMENDATION_SECTION_COPY,
  type RecommendationSectionType,
} from "@/lib/recommendations/section-copy";
import { setRecommendationAttribution } from "@/lib/recommendations/visitor-id";
import { cn } from "@/lib/utils";

type RecommendationSectionProps = {
  sectionType: RecommendationSectionType;
  productId?: Id<"products">;
  cartProductIds?: Id<"products">[];
  recentlyViewedProductIds?: Id<"products">[];
  limit?: number;
  className?: string;
  columns?: "3" | "4";
  enabled?: boolean;
  title?: string;
  description?: string;
};

export function RecommendationSection({
  sectionType,
  productId,
  cartProductIds,
  recentlyViewedProductIds,
  limit = 8,
  className,
  columns = "4",
  enabled = true,
  title,
  description,
}: RecommendationSectionProps) {
  const copy = RECOMMENDATION_SECTION_COPY[sectionType];
  const { products, productIds, cacheKey, loading } = useRecommendations({
    sectionType,
    productId,
    cartProductIds,
    recentlyViewedProductIds,
    limit,
    enabled,
  });
  const { trackImpression, trackClick } = useRecommendationTracking();
  const impressedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!products?.length) return;
    for (const product of products as Product[]) {
      const key = product._id;
      if (impressedRef.current.has(key)) continue;
      impressedRef.current.add(key);
      void trackImpression(sectionType, product._id, cacheKey);
    }
  }, [products, sectionType, cacheKey, trackImpression]);

  if (!loading && productIds.length === 0) {
    return null;
  }

  const gridClass =
    columns === "3"
      ? "mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3"
      : "mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4";

  return (
    <section className={className}>
      <AnimatedSectionHeader
        title={title ?? copy.title}
        description={description ?? copy.description}
      />

      {loading ? (
        <div className={gridClass}>
          {Array.from({ length: Math.min(limit, 4) }).map((_, index) => (
            <Skeleton key={index} className="h-[18rem] rounded-2xl" />
          ))}
        </div>
      ) : (
        <StaggerGroup className={cn(gridClass, "auto-rows-fr items-stretch")}>
          {(products as Product[]).map((product, index) => (
            <StaggerItem key={productCardKey(product)} index={index}>
              <div
                onClick={() => {
                  void trackClick(sectionType, product._id, cacheKey);
                  setRecommendationAttribution({
                    sectionType,
                    productId: product._id,
                    cacheKey,
                    clickedAt: Date.now(),
                  });
                }}
              >
                <ProductCard {...product} animateEntrance={false} />
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </section>
  );
}

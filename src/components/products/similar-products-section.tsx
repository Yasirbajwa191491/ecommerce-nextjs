"use client";

import { useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import ProductCard from "@/components/products/ProductCard";
import { productCardKey } from "@/lib/product-images";
import { AnimatedSectionHeader } from "@/components/home/animated-section-header";
import { StaggerGroup, StaggerItem } from "@/components/home/scroll-reveal";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/types/product";

type SearchResultItem = {
  _id: Id<"products">;
};

type SimilarProductsSectionProps = {
  productId: Id<"products">;
  className?: string;
};

export function SimilarProductsSection({
  productId,
  className,
}: SimilarProductsSectionProps) {
  const getSimilar = useAction(api.productSearch.getSimilarProducts);
  const [productIds, setProductIds] = useState<Id<"products">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void getSimilar({ productId, limit: 8 })
      .then((results: SearchResultItem[]) => {
        if (!cancelled) {
          setProductIds(results.map((item) => item._id));
        }
      })
      .catch(() => {
        if (!cancelled) setProductIds([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [getSimilar, productId]);

  const products = useQuery(
    api.products.listByIds,
    productIds.length > 0 ? { ids: productIds } : "skip"
  );

  if (!loading && productIds.length === 0) {
    return null;
  }

  return (
    <section className={className}>
      <AnimatedSectionHeader
        title="You may also like"
        description="Similar products based on features, category, and customer reviews."
      />

      {loading || products === undefined ? (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[18rem] rounded-2xl" />
          ))}
        </div>
      ) : (
        <StaggerGroup className="mt-8 grid auto-rows-fr grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4">
          {(products as Product[]).map((product, index) => (
            <StaggerItem key={productCardKey(product)} index={index}>
              <ProductCard {...product} animateEntrance={false} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </section>
  );
}

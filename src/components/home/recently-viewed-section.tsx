"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ProductCarouselSection } from "@/components/home/product-carousel-section";
import { getRecentlyViewedIds } from "@/lib/recently-viewed-storage";
import type { Product } from "@/types/product";

export function RecentlyViewedSection() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(getRecentlyViewedIds());
    const handler = () => setIds(getRecentlyViewedIds());
    window.addEventListener("storefront:recently-viewed-change", handler);
    return () =>
      window.removeEventListener("storefront:recently-viewed-change", handler);
  }, []);

  const products = useQuery(
    api.products.listByIds,
    ids.length ? { ids: ids.slice(0, 8) as Id<"products">[] } : "skip"
  );

  if (!ids.length || products === undefined || products.length === 0) {
    return null;
  }

  return (
    <ProductCarouselSection
      badge="Your history"
      title="Recently Viewed"
      description="Pick up where you left off with products you recently explored."
      products={products as Product[]}
      action={{ label: "View all products", href: "/products" }}
      background="muted"
    />
  );
}

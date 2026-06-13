"use client";

import { useQuery } from "convex/react";
import { TrendingUp } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { ProductCarouselSection } from "@/components/home/product-carousel-section";

export function BestSellersSection() {
  const products = useQuery(api.products.bestSellers, { limit: 12 });

  return (
    <ProductCarouselSection
      badge="Top Picks"
      badgeIcon={TrendingUp}
      title="Best Sellers"
      description="Our most popular products based on customer orders and sales volume."
      products={products}
      action={{ label: "View All Products", href: "/products" }}
      background="default"
    />
  );
}

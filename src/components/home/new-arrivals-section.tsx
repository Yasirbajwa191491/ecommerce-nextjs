"use client";

import { useQuery } from "convex/react";
import { Sparkles } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { ProductCarouselSection } from "@/components/home/product-carousel-section";

export function NewArrivalsSection() {
  const products = useQuery(api.products.newArrivals, { limit: 12 });

  return (
    <ProductCarouselSection
      badge="Just In"
      badgeIcon={Sparkles}
      title="New Arrivals"
      description="Discover the latest additions to our catalog — fresh styles and new essentials."
      products={products}
      action={{ label: "Shop New In", href: "/products" }}
      background="muted"
    />
  );
}

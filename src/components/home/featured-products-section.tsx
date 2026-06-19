"use client";

import { useQuery } from "convex/react";
import { Sparkles } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { productCardKey } from "@/lib/product-images";
import ProductCard from "@/components/products/ProductCard";
import { AnimatedSectionHeader } from "@/components/home/animated-section-header";
import { ScrollReveal, StaggerGroup, StaggerItem } from "@/components/home/scroll-reveal";
import { MotionSkeleton } from "@/components/motion";
import { SHOP_BODY } from "@/lib/typography";
import { PAGE_GUTTER, HOME_SECTION_PADDING_Y } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

export function FeaturedProductsSection() {
  const products = useQuery(api.products.featured);

  return (
    <section className={cn("bg-muted/30", HOME_SECTION_PADDING_Y)}>
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <AnimatedSectionHeader
          badge="Curated"
          badgeIcon={Sparkles}
          title="Featured Products"
          description="Handpicked favorites from our catalog — quality pieces selected for style, value, and customer satisfaction."
          action={{ label: "View All Products", href: "/products" }}
        />

        {products === undefined ? (
          <div className="mt-8 grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:mt-10 lg:grid-cols-3 lg:gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <MotionSkeleton
                key={index}
                shimmer
                className="h-[22rem] w-full rounded-2xl"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <ScrollReveal className="mt-8" variant="scale">
            <div className="rounded-2xl border border-dashed border-border/80 bg-card px-6 py-16 text-center">
              <p className="text-lg font-semibold text-foreground">
                No featured products yet
              </p>
              <p className={cn("mt-2", SHOP_BODY)}>
                Mark products as featured in admin to showcase them here.
              </p>
            </div>
          </ScrollReveal>
        ) : (
          <StaggerGroup className="mt-8 grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:mt-10 lg:grid-cols-3 lg:gap-6">
              {products.map((product, index) => (
                <StaggerItem
                  key={productCardKey(product)}
                  index={index}
                >
                  <ProductCard {...product} animateEntrance={false} />
                </StaggerItem>
              ))}
            </StaggerGroup>
        )}
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Award } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { AnimatedSectionHeader } from "@/components/home/animated-section-header";
import { StaggerGroup, StaggerItem } from "@/components/home/scroll-reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_GUTTER } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

const BRAND_SKELETON_COUNT = 6;

export function PopularBrandsSection() {
  const brands = useQuery(api.products.listBrands, { limit: 12 });

  if (brands !== undefined && brands.length === 0) {
    return null;
  }

  return (
    <section className="border-y border-border/60 bg-muted/20 py-10 sm:py-12">
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <AnimatedSectionHeader
          badge="Partners"
          badgeIcon={Award}
          title="Popular Brands"
          description="Shop trusted names across furniture, electronics, and lifestyle essentials."
          align="center"
          className="sm:items-center sm:text-center"
        />

        {brands === undefined ? (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:mt-10">
            {Array.from({ length: BRAND_SKELETON_COUNT }, (_, index) => (
              <Skeleton
                key={`brand-skeleton-${index}`}
                className="h-14 min-w-28 rounded-xl"
              />
            ))}
          </div>
        ) : (
          <StaggerGroup className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:mt-10">
            {brands.map((brand, index) => (
              <StaggerItem key={brand.slug} index={index} variant="scale" staggerMs={70}>
                <Link
                  href={`/products?brand=${encodeURIComponent(brand.slug)}`}
                  className={cn(
                    "flex h-14 min-w-28 items-center justify-center rounded-xl border border-border/60 bg-card px-5",
                    "text-base font-bold tracking-wide text-muted-foreground sm:text-lg",
                    "transition-[transform,box-shadow,border-color,color] duration-500",
                    "hover:-translate-y-1 hover:border-[#6254f3]/35 hover:text-[#6254f3] hover:shadow-md"
                  )}
                  aria-label={`Shop ${brand.name} products`}
                >
                  {brand.name}
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </div>
    </section>
  );
}

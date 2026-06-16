"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Award } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { AboutSectionHeader } from "@/components/about/about-section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ABOUT_BRANDS } from "@/lib/about-content";
import { PAGE_GUTTER } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

const BRAND_SKELETON_COUNT = 6;

export function AboutBrandsSection() {
  const brands = useQuery(api.products.listBrands, { limit: 12 });

  if (brands !== undefined && brands.length === 0) {
    return null;
  }

  return (
    <section className="border-y border-border/60 bg-muted/20 py-8 sm:py-10 md:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <AboutSectionHeader
          badge="Partners"
          badgeIcon={Award}
          title={ABOUT_BRANDS.title}
          description={ABOUT_BRANDS.description}
        />

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-8 sm:gap-4 lg:mt-10">
          {brands === undefined
            ? Array.from({ length: BRAND_SKELETON_COUNT }, (_, index) => (
                <Skeleton
                  key={`brand-skeleton-${index}`}
                  className="h-14 min-w-28 rounded-xl"
                />
              ))
            : brands.map((brand) => (
                <Link
                  key={brand.slug}
                  href={`/products?search=${encodeURIComponent(brand.name)}`}
                  className={cn(
                    "flex h-14 min-w-28 items-center justify-center rounded-xl border border-border/60 bg-card px-5",
                    "text-sm font-bold tracking-wide text-muted-foreground",
                    "transition-[transform,box-shadow,border-color,color] duration-300",
                    "hover:-translate-y-1 hover:border-[#6254f3]/35 hover:text-[#6254f3] hover:shadow-md"
                  )}
                  aria-label={`Shop ${brand.name} products`}
                >
                  {brand.name}
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { Award } from "lucide-react";
import { SectionHeader } from "@/components/home/section-header";
import { ScrollReveal, StaggerGroup, StaggerItem } from "@/components/home/scroll-reveal";
import { PLACEHOLDER_BRANDS } from "@/lib/home-content";
import { PAGE_GUTTER } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

type PopularBrandsSectionProps = {
  brands?: typeof PLACEHOLDER_BRANDS;
};

/**
 * Future-ready brand showcase. Pass `brands` from admin settings when available.
 */
export function PopularBrandsSection({
  brands = PLACEHOLDER_BRANDS,
}: PopularBrandsSectionProps) {
  if (brands.length === 0) return null;

  return (
    <section className="border-y border-border/60 bg-muted/20 py-10 sm:py-12">
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <ScrollReveal variant="fade">
          <SectionHeader
            badge="Partners"
            badgeIcon={Award}
            title="Popular Brands"
            description="Shop trusted names across furniture, electronics, and lifestyle essentials."
            align="center"
            className="sm:items-center sm:text-center"
          />
        </ScrollReveal>

        <StaggerGroup className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:mt-10">
          {brands.map((brand, index) => (
            <StaggerItem key={brand.slug} index={index} variant="scale" staggerMs={70}>
              <div
                className={cn(
                  "flex h-14 min-w-[7rem] items-center justify-center rounded-xl border border-border/60 bg-card px-5",
                  "text-sm font-bold tracking-wide text-muted-foreground",
                  "transition-[transform,box-shadow,border-color,color] duration-500",
                  "hover:-translate-y-1 hover:border-[#6254f3]/35 hover:text-[#6254f3] hover:shadow-md"
                )}
                aria-label={`${brand.name} brand`}
              >
                {brand.name}
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import { useQuery } from "convex/react";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { AnimatedSectionHeader } from "@/components/home/animated-section-header";
import { ScrollReveal, StaggerGroup, StaggerItem } from "@/components/home/scroll-reveal";
import {
  MotionHoverArrow,
  MotionHoverCaption,
  MotionHoverCard,
  MotionHoverImage,
  MotionHoverOverlay,
  MotionSkeleton,
} from "@/components/motion";
import {
  CATEGORY_IMAGE_FALLBACKS,
  DEFAULT_CATEGORY_IMAGE,
} from "@/lib/home-content";
import { PAGE_GUTTER, HOME_SECTION_PADDING_Y } from "@/lib/layout-constants";
import { CATEGORY_CARD_COUNT, CATEGORY_CARD_NAME } from "@/lib/typography";
import { cn } from "@/lib/utils";

function getCategoryImage(slug: string, sampleImageUrl: string | null) {
  if (sampleImageUrl) return sampleImageUrl;
  return CATEGORY_IMAGE_FALLBACKS[slug] ?? DEFAULT_CATEGORY_IMAGE;
}

export function ShopByCategorySection() {
  const categories = useQuery(api.productCategories.listWithProductCounts);

  return (
    <section className={cn("bg-background", HOME_SECTION_PADDING_Y)}>
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <AnimatedSectionHeader
          badge="Explore"
          badgeIcon={LayoutGrid}
          title="Shop By Category"
          description="Browse our curated collections and find the perfect products for every room and lifestyle."
          align="center"
          className="sm:items-center sm:text-center"
        />

        {categories === undefined ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:mt-10 lg:grid-cols-6 lg:gap-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <MotionSkeleton key={index} shimmer className="aspect-[3/4] min-h-[200px] rounded-2xl sm:min-h-[240px]" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <ScrollReveal className="mt-8" variant="scale">
            <div className="rounded-2xl border border-dashed border-border/80 px-6 py-12 text-center">
              <p className="text-base font-semibold text-foreground">
                Categories coming soon
              </p>
            </div>
          </ScrollReveal>
        ) : (
          <StaggerGroup className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:mt-10 lg:grid-cols-6 lg:gap-5">
            {categories.map((category, index) => (
              <StaggerItem key={category._id} index={index} variant="scale">
                <MotionHoverCard
                  href={`/products?category=${category.slug}`}
                  className="border-0 shadow-none hover:border-[#6254f3]/35"
                >
                  <div className="relative aspect-[3/4] min-h-[200px] bg-muted sm:min-h-[240px] md:min-h-[280px]">
                    <MotionHoverImage className="absolute inset-0">
                      <Image
                        src={getCategoryImage(
                          category.slug,
                          category.sampleImageUrl
                        )}
                        alt={category.name}
                        fill
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
                        className="object-cover object-center"
                      />
                    </MotionHoverImage>

                    <MotionHoverOverlay
                      className={cn(
                        "bg-gradient-to-t from-[#0a1435]/90 via-[#0a1435]/30 to-transparent"
                      )}
                    />

                    <div className="home-category-shine" aria-hidden />

                    <MotionHoverArrow className="top-3 right-3 flex size-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm">
                      <ArrowRight className="size-3.5" />
                    </MotionHoverArrow>

                    <MotionHoverCaption className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                      <h3 className={CATEGORY_CARD_NAME}>{category.name}</h3>
                      <p className={CATEGORY_CARD_COUNT}>
                        {category.productCount}{" "}
                        {category.productCount === 1 ? "Product" : "Products"}
                      </p>
                    </MotionHoverCaption>
                  </div>
                </MotionHoverCard>
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </div>
    </section>
  );
}

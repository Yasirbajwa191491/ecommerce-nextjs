"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AnimatedSectionHeader } from "@/components/home/animated-section-header";
import { StaggerGroup, StaggerItem } from "@/components/home/scroll-reveal";
import { PromotionStorefrontCard } from "@/components/promotions/promotion-storefront-card";
import { PAGE_GUTTER, SECTION_PADDING_Y } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";
import { useStableNow } from "@/hooks/use-stable-now";

export function SpecialPromotionsSection() {
  const now = useStableNow();
  const promotions = useQuery(api.productPromotions.listActiveForStorefront, {
    now,
  });

  if (!promotions?.length || promotions.length <= 1) {
    return null;
  }

  return (
    <section className={cn("border-y border-border/60 bg-muted/20", SECTION_PADDING_Y)}>
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <AnimatedSectionHeader
          badge="Limited time"
          title="Special Promotions"
          description="Exclusive bundle deals — buy the qualifying quantity and receive free items at checkout."
        />
        <StaggerGroup className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
          {promotions.map((promo, index) => (
            <StaggerItem key={promo._id} index={index} className="h-full">
              <PromotionStorefrontCard promotion={promo} className="h-full" />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

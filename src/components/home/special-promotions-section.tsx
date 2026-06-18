"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SectionHeader } from "@/components/home/section-header";
import { StaggerGroup, StaggerItem } from "@/components/home/scroll-reveal";
import { PromotionStorefrontCard } from "@/components/promotions/promotion-storefront-card";
import { PAGE_GUTTER } from "@/lib/layout-constants";
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
    <section className="border-y border-border/60 bg-muted/20 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <SectionHeader
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

"use client";

import { PromotionStorefrontCard } from "@/components/promotions/promotion-storefront-card";
import { ShopEmptyState } from "@/components/shop/shop-empty-state";
import {
  useStorefrontPromotionsList,
  type StorefrontPromotionsList,
} from "@/hooks/use-storefront-promotions";
import { CONTENT_SECTION_PADDING_Y, PAGE_GUTTER } from "@/lib/layout-constants";
import { SHOP_PAGE_LEAD, SHOP_PAGE_TITLE } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { Tag } from "lucide-react";
import { MotionSkeleton } from "@/components/motion";

export function PromotionsPageView({
  initialPromotions,
}: {
  initialPromotions?: StorefrontPromotionsList;
}) {
  const promotionsQuery = useStorefrontPromotionsList();
  const promotions = promotionsQuery ?? initialPromotions;

  return (
    <div className={cn("min-h-[60vh] bg-muted/20", CONTENT_SECTION_PADDING_Y)}>
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <header className="mb-8 max-w-2xl">
          <h1 className={SHOP_PAGE_TITLE}>Promotions & Deals</h1>
          <p className={SHOP_PAGE_LEAD}>
            Exclusive offers, bundle deals, and limited-time savings across our
            catalog.
          </p>
        </header>

        {promotions === undefined ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <MotionSkeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : promotions.length === 0 ? (
          <ShopEmptyState
            icon={Tag}
            title="No active promotions"
            description="Check back soon for new deals and exclusive offers."
            action={{ href: "/products", label: "Browse products" }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
            {promotions.map((promo) => (
              <PromotionStorefrontCard key={promo._id} promotion={promo} className="h-full" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

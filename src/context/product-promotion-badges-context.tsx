"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useStableNow } from "@/hooks/use-stable-now";
import {
  formatPromotionBadgeShort,
  getPromotionDisplay,
  type PromotionDisplayInput,
} from "@/lib/promotion-display";

export type ProductPromotionBadge = {
  promotionId: Id<"productPromotions">;
  typeLabel: string;
  title: string;
  subtitle: string;
  offerLine: string;
  shortLabel: string;
  endAt: number;
};

type ProductPromotionBadgesContextValue = {
  getBadge: (productId: Id<"products">) => ProductPromotionBadge | undefined;
  isLoading: boolean;
};

const ProductPromotionBadgesContext =
  createContext<ProductPromotionBadgesContextValue | null>(null);

function toBadge(
  promotion: PromotionDisplayInput & {
    _id: Id<"productPromotions">;
    typeLabel: string;
    endAt: number;
  }
): ProductPromotionBadge {
  const display = getPromotionDisplay(promotion);
  return {
    promotionId: promotion._id,
    typeLabel: promotion.typeLabel,
    title: display.title,
    subtitle: display.subtitle,
    offerLine: display.offerLine,
    shortLabel: formatPromotionBadgeShort(promotion),
    endAt: promotion.endAt,
  };
}

export function ProductPromotionBadgesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const now = useStableNow();
  const promotions = useQuery(api.productPromotions.listActiveForStorefront, {
    now,
  });

  const badgeByProductId = useMemo(() => {
    const map = new Map<string, ProductPromotionBadge>();
    if (!promotions) return map;

    for (const promo of promotions) {
      const badge = toBadge(promo);
      if (!map.has(promo.buyProductId)) {
        map.set(promo.buyProductId, badge);
      }
    }

    return map;
  }, [promotions]);

  const value = useMemo(
    () => ({
      getBadge: (productId: Id<"products">) =>
        badgeByProductId.get(productId),
      isLoading: promotions === undefined,
    }),
    [badgeByProductId, promotions]
  );

  return (
    <ProductPromotionBadgesContext.Provider value={value}>
      {children}
    </ProductPromotionBadgesContext.Provider>
  );
}

export function useProductPromotionBadge(productId: Id<"products">) {
  const ctx = useContext(ProductPromotionBadgesContext);
  if (!ctx) return undefined;
  return ctx.getBadge(productId);
}

"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCatalogNow } from "@/hooks/use-stable-now";

export type StorefrontPromotionDetail = FunctionReturnType<
  typeof api.productPromotions.getStorefrontById
>;

export type ActiveProductPromotions = FunctionReturnType<
  typeof api.productPromotions.getActiveForProduct
>;

type StorefrontPromotionsList = FunctionReturnType<
  typeof api.productPromotions.listActiveForStorefront
>;

const activeForProductCache = new Map<string, ActiveProductPromotions>();
const storefrontByIdCache = new Map<string, StorefrontPromotionDetail>();
let storefrontListCache: StorefrontPromotionsList | undefined;

function catalogCacheKey(...parts: (string | number)[]) {
  return parts.join(":");
}

export function useActivePromotionsForProduct(
  productId: Id<"products"> | undefined | null
) {
  const now = useCatalogNow();
  const query = useQuery(
    api.productPromotions.getActiveForProduct,
    productId ? { productId, now } : "skip"
  );
  const key = productId ? catalogCacheKey(productId, now) : "";
  if (query !== undefined && key) {
    activeForProductCache.set(key, query);
  }
  return query ?? (key ? activeForProductCache.get(key) : undefined);
}

export function useStorefrontPromotion(
  promoId: Id<"productPromotions"> | null | undefined
) {
  const now = useCatalogNow();
  const query = useQuery(
    api.productPromotions.getStorefrontById,
    promoId ? { id: promoId, now } : "skip"
  );
  const key = promoId ? catalogCacheKey(promoId, now) : "";
  if (query !== undefined && key) {
    storefrontByIdCache.set(key, query);
  }
  return query ?? (key ? storefrontByIdCache.get(key) : undefined);
}

export function useStorefrontPromotionsList() {
  const now = useCatalogNow();
  const query = useQuery(api.productPromotions.listActiveForStorefront, { now });
  if (query !== undefined) {
    storefrontListCache = query;
  }
  return query ?? storefrontListCache;
}

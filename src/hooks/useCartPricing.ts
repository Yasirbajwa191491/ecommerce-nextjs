"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { CartPricedLine } from "@/components/cart/cart-line-pricing";
import { useStableNow } from "@/hooks/use-stable-now";
import { cartItemsToCheckoutLines, cartLineKey } from "@/lib/cart-lines";
import { resolveCartProductId, type CartItem } from "@/reducer/cartReducer";

type PricedCartItem = {
  productId: Id<"products">;
  color: string;
  originalUnitPrice: number;
  discountPercent: number;
  discountAmount: number;
  lineDiscountTotal: number;
  finalUnitPrice: number;
  lineTotal: number;
  lineShippingTotal: number;
};

export function toCartPricedLine(item: PricedCartItem): CartPricedLine {
  return {
    originalUnitPrice: item.originalUnitPrice,
    discountPercent: item.discountPercent,
    discountAmount: item.discountAmount,
    lineDiscountTotal: item.lineDiscountTotal,
    finalUnitPrice: item.finalUnitPrice,
    lineTotal: item.lineTotal,
    lineShippingTotal: item.lineShippingTotal,
  };
}

export function useCartPricing(
  cart: CartItem[],
  deliveryMethod?: string
) {
  const now = useStableNow();
  const lines = useMemo(() => cartItemsToCheckoutLines(cart), [cart]);

  const result = useQuery(
    api.orders.validateCartForCheckout,
    cart.length > 0
      ? {
          lines,
          now,
          deliveryMethod: deliveryMethod as
            | "standard"
            | "express"
            | "same_day"
            | "next_day"
            | "pickup"
            | undefined,
        }
      : "skip"
  );

  const priced = result?.status === "ok" ? result : undefined;
  const pricingError =
    result?.status === "error" ? result.message : undefined;

  const pricedItemByKey = useMemo(() => {
    const map = new Map<string, PricedCartItem>();
    if (!priced?.items) return map;
    for (const item of priced.items) {
      if (item.isPromotionGift) continue;
      map.set(cartLineKey(item.productId, item.color), item);
    }
    return map;
  }, [priced]);

  const getPricedItem = (item: CartItem) =>
    pricedItemByKey.get(
      cartLineKey(resolveCartProductId(item), item.color)
    );

  return {
    priced,
    pricingError,
    isLoading: cart.length > 0 && result === undefined,
    getPricedItem,
  };
}

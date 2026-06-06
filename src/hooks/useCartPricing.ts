"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { CartPricedLine } from "@/components/cart/cart-line-pricing";
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

export function useCartPricing(cart: CartItem[]) {
  const lines = useMemo(
    () =>
      cart.map((item) => ({
        productId: resolveCartProductId(item) as Id<"products">,
        color: item.color,
        quantity: item.amount,
      })),
    [cart]
  );

  const priced = useQuery(
    api.orders.validateCartForCheckout,
    cart.length > 0 ? { lines } : "skip"
  );

  const pricedItemByKey = useMemo(() => {
    const map = new Map<string, PricedCartItem>();
    if (!priced?.items) return map;
    for (const item of priced.items) {
      map.set(`${item.productId}${item.color}`, item);
    }
    return map;
  }, [priced]);

  const getPricedItem = (item: CartItem) =>
    pricedItemByKey.get(`${resolveCartProductId(item)}${item.color}`);

  return {
    priced,
    isLoading: cart.length > 0 && priced === undefined,
    getPricedItem,
  };
}

"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { CartPricedLine } from "@/components/cart/cart-line-pricing";
import { useCatalogNow } from "@/hooks/use-stable-now";
import { cartItemsToCheckoutLines, cartLineKey } from "@/lib/cart-lines";
import { MIXED_CURRENCY_CART_MESSAGE } from "@/lib/errors";
import { resolveCartProductId, type CartItem } from "@/reducer/cartReducer";
import { DEFAULT_CURRENCY } from "@ecommerce/shared";

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

type CartPricingResult = FunctionReturnType<
  typeof api.orders.validateCartForCheckout
>;

let cartPricingCache: { key: string; result: CartPricingResult } | undefined;

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

function resolveCartItemCurrency(currency?: string | null): string {
  const code = currency?.trim();
  return code && code.length >= 3 ? code.toUpperCase() : DEFAULT_CURRENCY;
}

export function useCartPricing(
  cart: CartItem[],
  deliveryMethod?: string
) {
  const now = useCatalogNow();
  const lines = useMemo(() => cartItemsToCheckoutLines(cart), [cart]);

  const mixedCurrency = useMemo(() => {
    if (cart.length < 2) return false;
    const known = cart
      .map((item) => item.currency?.trim())
      .filter((code): code is string => Boolean(code));
    if (known.length < 2) return false;
    return new Set(known.map((code) => resolveCartItemCurrency(code))).size > 1;
  }, [cart]);

  const pricingCacheKey = useMemo(
    () =>
      cart.length > 0
        ? JSON.stringify({ lines, now, deliveryMethod: deliveryMethod ?? null })
        : "",
    [cart.length, lines, now, deliveryMethod]
  );

  const resultQuery = useQuery(
    api.orders.validateCartForCheckout,
    cart.length > 0 && !mixedCurrency
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

  if (resultQuery !== undefined && pricingCacheKey) {
    cartPricingCache = { key: pricingCacheKey, result: resultQuery };
  }

  const result =
    resultQuery ??
    (pricingCacheKey && cartPricingCache?.key === pricingCacheKey
      ? cartPricingCache.result
      : undefined);

  const priced = result?.status === "ok" ? result : undefined;
  const pricingError = mixedCurrency
    ? MIXED_CURRENCY_CART_MESSAGE
    : result?.status === "error"
      ? result.message
      : undefined;

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

  const getItemCurrency = (item: CartItem) =>
    resolveCartItemCurrency(item.currency ?? priced?.currency);

  return {
    priced,
    pricingError,
    mixedCurrency,
    isLoading:
      cart.length > 0 &&
      !mixedCurrency &&
      result === undefined &&
      !(pricingCacheKey && cartPricingCache?.key === pricingCacheKey),
    getPricedItem,
    getItemCurrency,
  };
}

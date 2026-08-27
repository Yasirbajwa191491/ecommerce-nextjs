import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo } from "react";

import {
  cartItemsToCheckoutLinesForProducts,
  cartLineKey,
  resolveCartProductId,
  resolveProductColorOrDefault,
  type CartLineLike,
  type PricedCartItem,
} from "@/lib/cart-lines";
import { MIXED_CURRENCY_CART_MESSAGE } from "@/lib/errors";
import { resolveProductCurrency } from "@/lib/product-display";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useStableNow } from "@/hooks/useStableNow";
import { api } from "@/lib/convex-api";

export function useCartPricing(
  cart: CartLineLike[],
  deliveryMethod?: "standard" | "express" | "same_day" | "next_day" | "pickup"
) {
  const now = useStableNow();
  const isOnline = useOnlineStatus();

  const productIds = useMemo(() => {
    if (cart.length === 0) return [] as Id<"products">[];
    return [...new Set(cart.map((item) => resolveCartProductId(item)))] as Id<"products">[];
  }, [cart]);

  const products = useQuery(
    api.products.listByIds,
    isOnline && productIds.length > 0 ? { ids: productIds } : "skip"
  );

  const productsById = useMemo(() => {
    if (!products) return undefined;
    return new Map(products.map((product) => [product._id, product]));
  }, [products]);

  const mixedCurrency = useMemo(() => {
    if (cart.length < 2) return false;
    const codes = new Set<string>();

    if (productsById === undefined) {
      for (const item of cart) {
        if (item.currency?.trim()) {
          codes.add(resolveProductCurrency(item.currency));
        }
      }
      return codes.size > 1;
    }

    for (const item of cart) {
      const product = productsById.get(resolveCartProductId(item) as Id<"products">);
      codes.add(resolveProductCurrency(product?.currency ?? item.currency));
    }
    return codes.size > 1;
  }, [cart, productsById]);

  const lines = useMemo(() => {
    if (cart.length === 0) return [];
    if (productsById === undefined) return undefined;

    return cartItemsToCheckoutLinesForProducts(cart, productsById).map((line) => ({
      productId: line.productId as Id<"products">,
      color: line.color,
      quantity: line.quantity,
    }));
  }, [cart, productsById]);

  const result = useQuery(
    api.orders.validateCartForCheckout,
    isOnline && !mixedCurrency && lines && lines.length > 0
      ? { lines, now, deliveryMethod }
      : "skip"
  );

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

  const getPricedItem = (item: CartLineLike) => {
    const productId = resolveCartProductId(item);
    const product = productsById?.get(productId as Id<"products">);
    const color = resolveProductColorOrDefault(product?.colors ?? [], item.color);
    return pricedItemByKey.get(cartLineKey(productId, color));
  };

  const getItemCurrency = (item: CartLineLike) => {
    const product = productsById?.get(resolveCartProductId(item) as Id<"products">);
    return resolveProductCurrency(product?.currency ?? item.currency);
  };

  return {
    priced,
    pricingError,
    mixedCurrency,
    lines,
    isLoading:
      isOnline &&
      cart.length > 0 &&
      !mixedCurrency &&
      (products === undefined || result === undefined),
    isOffline: !isOnline && cart.length > 0,
    getPricedItem,
    getItemCurrency,
  };
}

import type { Id } from "@convex/_generated/dataModel";

import { useQuery } from "convex/react";

import { useMemo } from "react";



import {

  cartItemsToCheckoutLinesForProducts,

  cartLineKey,

  resolveCartProductId,

  type CartLineLike,

  type PricedCartItem,

} from "@/lib/cart-lines";

import { useStableNow } from "@/hooks/useStableNow";

import { api } from "@/lib/convex-api";



export function useCartPricing(
  cart: CartLineLike[],
  deliveryMethod: "standard" | "express" | "same_day" | "next_day" | "pickup" = "standard"
) {

  const now = useStableNow();



  const productIds = useMemo(() => {

    if (cart.length === 0) return [] as Id<"products">[];

    return [...new Set(cart.map((item) => resolveCartProductId(item)))] as Id<"products">[];

  }, [cart]);



  const products = useQuery(

    api.products.listByIds,

    productIds.length > 0 ? { ids: productIds } : "skip"

  );



  const lines = useMemo(() => {

    if (cart.length === 0) return [];

    if (products === undefined) return undefined;



    const productsById = new Map(products.map((product) => [product._id, product]));

    return cartItemsToCheckoutLinesForProducts(cart, productsById).map((line) => ({

      productId: line.productId as Id<"products">,

      color: line.color,

      quantity: line.quantity,

    }));

  }, [cart, products]);



  const result = useQuery(

    api.orders.validateCartForCheckout,

    lines && lines.length > 0 ? { lines, now, deliveryMethod } : "skip"

  );



  const priced = result?.status === "ok" ? result : undefined;

  const pricingError = result?.status === "error" ? result.message : undefined;



  const pricedItemByKey = useMemo(() => {

    const map = new Map<string, PricedCartItem>();

    if (!priced?.items) return map;

    for (const item of priced.items) {

      if (item.isPromotionGift) continue;

      map.set(cartLineKey(item.productId, item.color), item);

    }

    return map;

  }, [priced]);



  const getPricedItem = (item: CartLineLike) =>

    pricedItemByKey.get(

      cartLineKey(resolveCartProductId(item), item.color)

    );



  return {

    priced,

    pricingError,

    isLoading: cart.length > 0 && (products === undefined || result === undefined),

    getPricedItem,

  };

}



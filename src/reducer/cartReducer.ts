import { Product } from "@/types/product";

import { getPrimaryImageUrl } from "@/lib/product-images";

import {

  buildCartLineId,

  consolidateCartItems,

  findCartLineIndex,

  normalizeCartColor,

  resolveCartProductId,

  resolveProductColorOrDefault,

  type CartLineLike,

} from "@/lib/cart-lines";



export type CartItem = CartLineLike;



export type CartState = {

  cart: CartItem[];

  total_item: number;

  total_price: number;

  shipping_fee: number;

};



type CartAction =

  | { type: "ADD_TO_CART"; payload: { id: string; color: string; amount: number; product: Product } }

  | { type: "REMOVE_ITEM"; payload: string }

  | { type: "SET_INCREMENT"; payload: string }

  | { type: "SET_DECREMENT"; payload: string }

  | { type: "CLEAR_CART" }

  | { type: "CART_ITEM_PRICE_TOTAL" }

  | { type: "NORMALIZE_CART" };



export { resolveCartProductId } from "@/lib/cart-lines";



export function normalizeCartItem(item: CartItem): CartItem {

  const productId = resolveCartProductId(item);

  const color = normalizeCartColor(item.color);

  return {

    ...item,

    id: buildCartLineId(productId, color),

    productId,

    color,

  };

}



const getLocalCartData = (): CartItem[] => {

  if (typeof window === "undefined") return [];

  try {

    const raw = JSON.parse(localStorage.getItem("thapaCart") || "[]") as CartItem[];

    return consolidateCartItems(raw.map(normalizeCartItem));

  } catch {

    return [];

  }

};



export const cartInitialState: CartState = {

  cart: [],

  total_item: 0,

  total_price: 0,

  shipping_fee: 0,

};



export function cartReducer(state: CartState, action: CartAction): CartState {

  switch (action.type) {

    case "ADD_TO_CART": {

      const { id, color, amount, product } = action.payload;

      const productId = id;

      const normalizedColor = normalizeCartColor(
        resolveProductColorOrDefault(product.colors, color)
      );

      const lineId = buildCartLineId(productId, normalizedColor);

      const existingIndex = findCartLineIndex(

        state.cart,

        productId,

        normalizedColor

      );



      if (existingIndex >= 0) {

        const nextCart = state.cart.map((item, index) =>

          index === existingIndex

            ? {

                ...item,

                id: lineId,

                productId,

                color: normalizedColor,

                amount: Math.min(item.max, item.amount + amount),

              }

            : item

        );

        return { ...state, cart: nextCart };

      }



      return {

        ...state,

        cart: [

          ...state.cart,

          {

            id: lineId,

            productId,

            name: product.name,

            color: normalizedColor,

            amount,

            image: getPrimaryImageUrl(product, ""),

            price: product.price,

            max: product.stock,

          },

        ],

      };

    }

    case "SET_DECREMENT":

      return {

        ...state,

        cart: state.cart.map((i) =>

          i.id === action.payload ? { ...i, amount: Math.max(1, i.amount - 1) } : i

        ),

      };

    case "SET_INCREMENT":

      return {

        ...state,

        cart: state.cart.map((i) =>

          i.id === action.payload ? { ...i, amount: Math.min(i.max, i.amount + 1) } : i

        ),

      };

    case "REMOVE_ITEM":

      return { ...state, cart: state.cart.filter((i) => i.id !== action.payload) };

    case "CLEAR_CART":

      if (!state.cart.length) return state;

      return { ...state, cart: [], total_item: 0, total_price: 0 };

    case "NORMALIZE_CART":

      return {

        ...state,

        cart: consolidateCartItems(state.cart.map(normalizeCartItem)),

      };

    case "CART_ITEM_PRICE_TOTAL": {

      const totals = state.cart.reduce(

        (a, i) => ({

          total_item: a.total_item + i.amount,

          total_price: a.total_price + i.price * i.amount,

        }),

        { total_item: 0, total_price: 0 }

      );

      return { ...state, ...totals };

    }

    default:

      return state;

  }

}



export function getInitialCartState(): CartState {

  return { ...cartInitialState, cart: getLocalCartData() };

}



"use client";

import { createContext, useContext, useEffect, useReducer, ReactNode } from "react";
import { Product } from "@/types/product";
import { cartReducer, getInitialCartState } from "@/reducer/cartReducer";

type Ctx = ReturnType<typeof getInitialCartState> & {
  addToCart: (id: string, color: string, amount: number, product: Product) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setDecrease: (id: string) => void;
  setIncrement: (id: string) => void;
};

const CartContext = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, getInitialCartState);

  useEffect(() => {
    dispatch({ type: "CART_ITEM_PRICE_TOTAL" });
    if (state.cart.length) localStorage.setItem("thapaCart", JSON.stringify(state.cart));
  }, [state.cart]);

  return (
    <CartContext.Provider
      value={{
        ...state,
        addToCart: (id, color, amount, product) =>
          dispatch({ type: "ADD_TO_CART", payload: { id, color, amount, product } }),
        setDecrease: (id) => dispatch({ type: "SET_DECREMENT", payload: id }),
        setIncrement: (id) => dispatch({ type: "SET_INCREMENT", payload: id }),
        removeItem: (id) => dispatch({ type: "REMOVE_ITEM", payload: id }),
        clearCart: () => dispatch({ type: "CLEAR_CART" }),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCartContext requires provider");
  return ctx;
}

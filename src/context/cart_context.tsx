"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, ReactNode } from "react";
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
    dispatch({ type: "NORMALIZE_CART" });
  }, []);

  useEffect(() => {
    dispatch({ type: "CART_ITEM_PRICE_TOTAL" });
    if (state.cart.length) localStorage.setItem("thapaCart", JSON.stringify(state.cart));
    else localStorage.removeItem("thapaCart");
  }, [state.cart]);

  const addToCart = useCallback(
    (id: string, color: string, amount: number, product: Product) =>
      dispatch({ type: "ADD_TO_CART", payload: { id, color, amount, product } }),
    []
  );
  const setDecrease = useCallback(
    (id: string) => dispatch({ type: "SET_DECREMENT", payload: id }),
    []
  );
  const setIncrement = useCallback(
    (id: string) => dispatch({ type: "SET_INCREMENT", payload: id }),
    []
  );
  const removeItem = useCallback(
    (id: string) => dispatch({ type: "REMOVE_ITEM", payload: id }),
    []
  );
  const clearCart = useCallback(() => dispatch({ type: "CLEAR_CART" }), []);

  const value = useMemo(
    () => ({
      ...state,
      addToCart,
      setDecrease,
      setIncrement,
      removeItem,
      clearCart,
    }),
    [state, addToCart, setDecrease, setIncrement, removeItem, clearCart]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCartContext requires provider");
  return ctx;
}

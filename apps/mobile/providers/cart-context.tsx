import AsyncStorage from "@react-native-async-storage/async-storage";

import { getPrimaryImageUrl } from "@ecommerce/shared";

import { useQuery } from "convex/react";

import type { Id } from "@convex/_generated/dataModel";

import {

  createContext,

  useCallback,

  useContext,

  useEffect,

  useMemo,

  useReducer,

  useRef,

  type ReactNode,

} from "react";



import {

  buildCartLineId,

  cartItemsToCheckoutLines,

  consolidateCartItems,

  findCartLineIndex,

  normalizeCartColor,

  resolveCartProductId,

  resolveProductColorOrDefault,

  sanitizeCartItemsWithProducts,

  type CartLineLike,

} from "@/lib/cart-lines";

import { api } from "@/lib/convex-api";

import { getIsOnline } from "@/lib/network";

import { CART_STORAGE_KEY } from "@ecommerce/shared";

import type { Product } from "@/types/product";



type CartState = {

  cart: CartLineLike[];

  hydrated: boolean;

};



type CartAction =

  | { type: "HYDRATE"; payload: CartLineLike[] }

  | {

      type: "ADD";

      payload: { product: Product; color: string; amount: number };

    }

  | { type: "REMOVE"; payload: string }

  | { type: "INCREMENT"; payload: string }

  | { type: "DECREMENT"; payload: string }

  | { type: "CLEAR" };



function cartReducer(state: CartState, action: CartAction): CartState {

  switch (action.type) {

    case "HYDRATE":

      return { cart: consolidateCartItems(action.payload), hydrated: true };

    case "ADD": {

      const { product, color, amount } = action.payload;

      const productId = product._id;

      const resolvedColor = resolveProductColorOrDefault(product.colors ?? [], color);

      const lineId = buildCartLineId(productId, resolvedColor);

      const image = getPrimaryImageUrl(product);

      const next = [...state.cart];

      const index = findCartLineIndex(next, productId, resolvedColor);

      const max = Math.max(product.stock ?? 99, 1);



      if (index >= 0) {

        const existing = next[index];

        next[index] = {

          ...existing,

          amount: Math.min(max, existing.amount + amount),

          max,

          currency: product.currency ?? existing.currency,

        };

      } else {

        next.push({

          id: lineId,

          productId,

          color: resolvedColor,

          amount: Math.min(max, amount),

          name: product.name,

          image,

          price: product.price,

          currency: product.currency,

          max,

        });

      }

      return { ...state, cart: consolidateCartItems(next) };

    }

    case "REMOVE":

      return {

        ...state,

        cart: state.cart.filter((item) => item.id !== action.payload),

      };

    case "INCREMENT": {

      const next = state.cart.map((item) => {

        if (item.id !== action.payload) return item;

        return { ...item, amount: Math.min(item.max, item.amount + 1) };

      });

      return { ...state, cart: next };

    }

    case "DECREMENT": {

      const next = state.cart

        .map((item) => {

          if (item.id !== action.payload) return item;

          return { ...item, amount: item.amount - 1 };

        })

        .filter((item) => item.amount > 0);

      return { ...state, cart: next };

    }

    case "CLEAR":

      return { ...state, cart: [] };

    default:

      return state;

  }

}



type CartContextValue = {

  cart: CartLineLike[];

  lines: ReturnType<typeof cartItemsToCheckoutLines>;

  itemCount: number;

  hydrated: boolean;

  addToCart: (product: Product, color?: string, amount?: number) => void;

  removeItem: (lineId: string) => void;

  incrementItem: (lineId: string) => void;

  decrementItem: (lineId: string) => void;

  clearCart: () => void;

};



const CartContext = createContext<CartContextValue | null>(null);



function CartSanitizer({

  cart,

  hydrated,

  onSanitize,

}: {

  cart: CartLineLike[];

  hydrated: boolean;

  onSanitize: (next: CartLineLike[]) => void;

}) {

  const sanitizedRef = useRef<string>("");



  const productIds = useMemo(() => {

    if (!hydrated || cart.length === 0) return [] as Id<"products">[];

    return [...new Set(cart.map((item) => resolveCartProductId(item)))] as Id<"products">[];

  }, [cart, hydrated]);



  const products = useQuery(

    api.products.listByIds,

    productIds.length > 0 && getIsOnline() ? { ids: productIds } : "skip"

  );



  useEffect(() => {

    if (!hydrated || products === undefined || cart.length === 0) return;



    const productsById = new Map(products.map((product) => [product._id, product]));

    const sanitized = sanitizeCartItemsWithProducts(cart, productsById);

    const signature = JSON.stringify(

      sanitized.map((item) => ({

        id: item.id,

        color: item.color,

        amount: item.amount,

      }))

    );



    if (signature === sanitizedRef.current) return;



    const currentSignature = JSON.stringify(

      cart.map((item) => ({

        id: item.id,

        color: item.color,

        amount: item.amount,

      }))

    );



    if (signature !== currentSignature) {

      sanitizedRef.current = signature;

      onSanitize(sanitized);

    } else {

      sanitizedRef.current = signature;

    }

  }, [cart, hydrated, onSanitize, products]);



  return null;

}



export function CartProvider({ children }: { children: ReactNode }) {

  const [state, dispatch] = useReducer(cartReducer, {

    cart: [],

    hydrated: false,

  });



  useEffect(() => {

    let cancelled = false;



    async function hydrate() {

      try {

        const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);

        if (cancelled) return;

        const parsed = raw ? (JSON.parse(raw) as CartLineLike[]) : [];

        const normalized = Array.isArray(parsed)

          ? parsed.map((item) => {

              const productId = resolveCartProductId(item);

              const color = normalizeCartColor(item.color);

              return {

                ...item,

                productId,

                color,

                id: buildCartLineId(productId, color),

              };

            })

          : [];

        dispatch({ type: "HYDRATE", payload: normalized });

      } catch {

        if (!cancelled) dispatch({ type: "HYDRATE", payload: [] });

      }

    }



    void hydrate();

    return () => {

      cancelled = true;

    };

  }, []);



  useEffect(() => {

    if (!state.hydrated) return;

    void AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart));

  }, [state.cart, state.hydrated]);



  const handleSanitize = useCallback((next: CartLineLike[]) => {

    dispatch({ type: "HYDRATE", payload: next });

  }, []);



  const addToCart = useCallback(

    (product: Product, color = "", amount = 1) => {

      dispatch({ type: "ADD", payload: { product, color, amount } });

    },

    []

  );



  const removeItem = useCallback((lineId: string) => {

    dispatch({ type: "REMOVE", payload: lineId });

  }, []);



  const incrementItem = useCallback((lineId: string) => {

    dispatch({ type: "INCREMENT", payload: lineId });

  }, []);



  const decrementItem = useCallback((lineId: string) => {

    dispatch({ type: "DECREMENT", payload: lineId });

  }, []);



  const clearCart = useCallback(() => {

    dispatch({ type: "CLEAR" });

  }, []);



  const lines = useMemo(

    () => cartItemsToCheckoutLines(state.cart),

    [state.cart]

  );



  const itemCount = useMemo(

    () => state.cart.reduce((sum, item) => sum + item.amount, 0),

    [state.cart]

  );



  const value = useMemo(

    () => ({

      cart: state.cart,

      lines,

      itemCount,

      hydrated: state.hydrated,

      addToCart,

      removeItem,

      incrementItem,

      decrementItem,

      clearCart,

    }),

    [

      state.cart,

      state.hydrated,

      lines,

      itemCount,

      addToCart,

      removeItem,

      incrementItem,

      decrementItem,

      clearCart,

    ]

  );



  return (

    <CartContext.Provider value={value}>

      <CartSanitizer

        cart={state.cart}

        hydrated={state.hydrated}

        onSanitize={handleSanitize}

      />

      {children}

    </CartContext.Provider>

  );

}



export function useCart() {

  const context = useContext(CartContext);

  if (!context) {

    throw new Error("useCart must be used within CartProvider");

  }

  return context;

}



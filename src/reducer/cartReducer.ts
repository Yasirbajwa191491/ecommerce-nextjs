import { Product } from "@/types/product";

export type CartItem = {
  id: string;
  name: string;
  color: string;
  amount: number;
  image: string;
  price: number;
  max: number;
};

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
  | { type: "CART_ITEM_PRICE_TOTAL" };

const getLocalCartData = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("thapaCart") || "[]");
  } catch {
    return [];
  }
};

export const cartInitialState: CartState = {
  cart: [],
  total_item: 0,
  total_price: 0,
  shipping_fee: 50000,
};

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_TO_CART": {
      const { id, color, amount, product } = action.payload;
      const existing = state.cart.find((i) => i.id === id + color);
      if (existing) {
        return {
          ...state,
          cart: state.cart.map((i) =>
            i.id === id + color
              ? { ...i, amount: Math.min(i.max, i.amount + amount) }
              : i
          ),
        };
      }
      return {
        ...state,
        cart: [
          ...state.cart,
          {
            id: id + color,
            name: product.name,
            color,
            amount,
            image: product.image[0]?.url ?? "",
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
      return { ...state, cart: [] };
    case "CART_ITEM_PRICE_TOTAL": {
      const totals = state.cart.reduce(
        (a, i) => ({ total_item: a.total_item + i.amount, total_price: a.total_price + i.price * i.amount }),
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

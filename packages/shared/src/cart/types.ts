/** Checkout cart line shape — matches Convex `CartLineInput`. */
export type CheckoutCartLine = {
  productId: string;
  color: string;
  quantity: number;
};

export const CART_STORAGE_KEY = "yasirCart";

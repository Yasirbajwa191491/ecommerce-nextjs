import { findCartLineIndex, normalizeCartColor, resolveProductColor, resolveProductColorOrDefault, type CartLineLike } from "./cart-lines";
import { resolveProductCurrency } from "./product-display";

/** Validate before changing cart state so failures never produce success toasts. */
export function getCartAdditionError(cart: CartLineLike[], product: {
  _id: string; stock: number; colors?: string[]; currency?: string;
}, color: string, amount: number): string | null {
  if (product.stock <= 0 || !Number.isInteger(amount) || amount < 1) return "This item is not available to add.";
  if (color && product.colors?.length && !resolveProductColor(product.colors, color)) {
    return "This color is no longer available. Please choose another.";
  }
  const currency = resolveProductCurrency(product.currency);
  const conflicting = cart.find((item) => resolveProductCurrency(item.currency) !== currency);
  if (conflicting) return `Your cart uses ${resolveProductCurrency(conflicting.currency)}. Complete or empty it before adding ${currency} items.`;
  const resolvedColor = resolveProductColorOrDefault(product.colors ?? [], color);
  const index = findCartLineIndex(cart, product._id, resolvedColor);
  const quantity = amount + (index >= 0 ? cart[index].amount : 0);
  // Stock is shared by variants in this catalog.
  const otherVariants = cart.filter((item) => item.productId === product._id && normalizeCartColor(item.color) !== resolvedColor)
    .reduce((sum, item) => sum + item.amount, 0);
  if (quantity + otherVariants > product.stock) return `Only ${product.stock} available. Adjust the quantity already in your cart.`;
  return null;
}

import { getCartAdditionError } from "./cart-addition";
import { buildCartLineId, consolidateCartItems, resolveProductColorOrDefault, type CartLineLike } from "./cart-lines";

type ReorderEntry = { product: { _id: string; stock: number; colors?: string[]; currency?: string; price: number }; color: string; quantity: number };

/** Validate the entire batch before changing the shopper's cart. */
export function getReorderCartError(cart: CartLineLike[], entries: ReorderEntry[], mode: "merge" | "replace"): string | null {
  if (!entries.length) return "None of the items from this order are available right now.";
  let preview = mode === "replace" ? [] : [...cart];
  for (const entry of entries) {
    const error = getCartAdditionError(preview, entry.product, entry.color, entry.quantity);
    if (error) return error;
    const color = resolveProductColorOrDefault(entry.product.colors ?? [], entry.color);
    preview = consolidateCartItems([...preview, {
      id: buildCartLineId(entry.product._id, color), productId: entry.product._id, color,
      amount: entry.quantity, price: entry.product.price, currency: entry.product.currency,
      name: "", image: "", max: entry.product.stock,
    }]);
  }
  return null;
}

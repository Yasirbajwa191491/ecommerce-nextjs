import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { isProductActive } from "./productActive";

export type CartLineInput = {
  productId: Id<"products">;
  color: string;
  quantity: number;
};

export type PricedLineItem = {
  productId: Id<"products">;
  productName: string;
  color: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string;
};

export type OrderTotals = {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  items: PricedLineItem[];
};

type DbCtx = QueryCtx | MutationCtx;

export async function priceCartLines(
  ctx: DbCtx,
  lines: CartLineInput[]
): Promise<OrderTotals> {
  if (!lines.length) {
    throw new Error("Your cart is empty");
  }

  const items: PricedLineItem[] = [];
  let currency: string | null = null;

  for (const line of lines) {
    const product = await ctx.db.get(line.productId);
    if (!product) {
      throw new Error("A product in your cart no longer exists");
    }
    if (!isProductActive(product)) {
      throw new Error(`"${product.name}" is no longer available`);
    }
    if (!product.colors.includes(line.color)) {
      throw new Error(`Invalid color selected for "${product.name}"`);
    }
    if (product.stock < line.quantity) {
      throw new Error(
        `Insufficient stock for "${product.name}". Only ${product.stock} available.`
      );
    }

    const productCurrency = product.currency ?? "USD";
    if (currency === null) {
      currency = productCurrency;
    } else if (currency !== productCurrency) {
      throw new Error("All items must use the same currency");
    }

    const unitPrice = product.price;
    const lineTotal = Math.round(unitPrice * line.quantity * 100) / 100;

    items.push({
      productId: line.productId,
      productName: product.name,
      color: line.color,
      quantity: line.quantity,
      unitPrice,
      lineTotal,
      imageUrl: product.image[0]?.url ?? "",
    });
  }

  const subtotal =
    Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) /
    100;
  const tax = 0;
  const shipping = 0;
  const total = Math.round((subtotal + tax + shipping) * 100) / 100;

  return {
    subtotal,
    tax,
    shipping,
    total,
    currency: currency ?? "USD",
    items,
  };
}

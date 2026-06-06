import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export type StockLine = {
  productId: Id<"products">;
  quantity: number;
};

export async function assertStockAvailable(
  ctx: MutationCtx,
  lines: StockLine[]
): Promise<void> {
  for (const line of lines) {
    const product = await ctx.db.get(line.productId);
    if (!product) {
      throw new Error("A product in your cart no longer exists");
    }
    if (product.stock < line.quantity) {
      throw new Error(
        `Insufficient stock for "${product.name}". Only ${product.stock} available.`
      );
    }
  }
}

export async function decrementStock(
  ctx: MutationCtx,
  lines: StockLine[]
): Promise<void> {
  for (const line of lines) {
    const product = await ctx.db.get(line.productId);
    if (!product) {
      throw new Error("A product in your cart no longer exists");
    }
    const nextStock = product.stock - line.quantity;
    if (nextStock < 0) {
      throw new Error(
        `Insufficient stock for "${product.name}". Only ${product.stock} available.`
      );
    }
    await ctx.db.patch(line.productId, { stock: nextStock });
  }
}

export async function restoreStock(
  ctx: MutationCtx,
  lines: StockLine[]
): Promise<void> {
  for (const line of lines) {
    const product = await ctx.db.get(line.productId);
    if (!product) continue;
    await ctx.db.patch(line.productId, {
      stock: product.stock + line.quantity,
    });
  }
}

export async function getOrderStockLines(
  ctx: MutationCtx,
  orderId: Id<"orders">
): Promise<StockLine[]> {
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_order_id", (q) => q.eq("orderId", orderId))
    .collect();
  return items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));
}

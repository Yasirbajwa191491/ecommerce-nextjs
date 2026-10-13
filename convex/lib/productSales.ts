import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export async function adjustProductSales(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  direction: 1 | -1
): Promise<void> {
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_order_id", (q) => q.eq("orderId", orderId))
    .take(100);

  for (const item of items) {
    const existing = await ctx.db
      .query("productSalesTotals")
      .withIndex("by_product", (q) => q.eq("productId", item.productId))
      .unique();
    const delta = direction * item.quantity;
    if (!existing) {
      if (delta <= 0) continue;
      await ctx.db.insert("productSalesTotals", {
        productId: item.productId,
        unitsSold: delta,
        updatedAt: Date.now(),
      });
      continue;
    }
    await ctx.db.patch(existing._id, {
      unitsSold: Math.max(0, existing.unitsSold + delta),
      updatedAt: Date.now(),
    });
  }
}

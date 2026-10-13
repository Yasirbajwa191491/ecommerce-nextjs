import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { calculateFinalPrice } from "../lib/pricing";

/** Release preparation for legacy rows before enabling the currency/price indexes. */
export const backfillProductFinalPrice = internalMutation({
  args: { cursor: v.optional(v.string()), batchSize: v.optional(v.number()), dryRun: v.optional(v.boolean()) },
  returns: v.object({ scanned: v.number(), missingOrStale: v.number(), patched: v.number(), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const batchSize = Math.min(100, Math.max(1, Math.floor(args.batchSize ?? 50)));
    const dryRun = args.dryRun ?? true;
    const result = await ctx.db.query("products").withIndex("by_sort_order").paginate({ cursor: args.cursor ?? null, numItems: batchSize });
    let missingOrStale = 0;
    let patched = 0;
    for (const product of result.page) {
      const finalPrice = calculateFinalPrice(product.price, product.discountPercent ?? 0);
      // Existing checkout/display already treats missing currency as USD. Normalize
      // the same code, without converting or changing the recorded price.
      const currency = product.currency?.trim().toUpperCase() || "USD";
      if (product.finalPrice === finalPrice && product.currency === currency) continue;
      missingOrStale += 1;
      if (!dryRun) { await ctx.db.patch(product._id, { finalPrice, currency }); patched += 1; }
    }
    return { scanned: result.page.length, missingOrStale, patched, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

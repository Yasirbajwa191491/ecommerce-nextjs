import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { buildReviewHighlights } from "./lib/ai/productIntelligenceHelpers";

export const getProductForIntelligence = internalQuery({
  args: { productId: v.id("products") },
  returns: v.union(
    v.object({
      productId: v.id("products"),
      name: v.string(),
      company: v.string(),
      description: v.string(),
      price: v.number(),
      currency: v.string(),
      stars: v.number(),
      reviews: v.number(),
      categoryId: v.id("productCategories"),
      categoryName: v.string(),
      active: v.boolean(),
      embeddingContentHash: v.optional(v.string()),
      reviewHighlights: v.array(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return null;

    const category = await ctx.db.get(product.categoryId);
    const insights = await ctx.db
      .query("productReviewInsights")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .unique();

    const reviewHighlights = buildReviewHighlights(
      insights?.summary,
      insights?.topics ?? []
    );

    return {
      productId: product._id,
      name: product.name,
      company: product.company,
      description: product.description,
      price: product.price,
      currency: product.currency ?? "USD",
      stars: product.stars,
      reviews: product.reviews,
      categoryId: product.categoryId,
      categoryName: category?.name ?? "General",
      active: product.active !== false,
      embeddingContentHash: product.embeddingContentHash,
      reviewHighlights,
    };
  },
});

export const listProductsNeedingEmbedding = internalQuery({
  args: {
    cursor: v.optional(v.number()),
    batchSize: v.number(),
  },
  returns: v.object({
    productIds: v.array(v.id("products")),
    nextCursor: v.optional(v.number()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const products = await ctx.db.query("products").collect();
    const needing = products.filter(
      (p) =>
        p.active !== false &&
        (p.embeddingStatus !== "complete" || !p.embedding?.length)
    );

    const start = args.cursor ?? 0;
    const batch = needing.slice(start, start + args.batchSize);
    const nextStart = start + args.batchSize;

    return {
      productIds: batch.map((p) => p._id),
      nextCursor: nextStart < needing.length ? nextStart : undefined,
      isDone: nextStart >= needing.length,
    };
  },
});

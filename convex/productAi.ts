import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/requireAdmin";
import {
  aiAnalysisStatusValidator,
  productInsightsStatusValidator,
} from "./lib/aiValidators";

export const setEmbeddingStatus = internalMutation({
  args: {
    productId: v.id("products"),
    status: aiAnalysisStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return null;

    await ctx.db.patch(args.productId, {
      embeddingStatus: args.status,
    });
    return null;
  },
});

export const applyProductIntelligence = internalMutation({
  args: {
    productId: v.id("products"),
    summary: v.string(),
    keywords: v.array(v.string()),
    useCases: v.array(v.string()),
    highlights: v.array(v.string()),
    reviewHighlights: v.array(v.string()),
    contentHash: v.string(),
    embedding: v.array(v.float64()),
    status: productInsightsStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return null;

    const now = Date.now();
    const existing = await ctx.db
      .query("productIntelligence")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .unique();

    const intelligenceData = {
      summary: args.summary,
      keywords: args.keywords,
      useCases: args.useCases,
      highlights: args.highlights,
      reviewHighlights: args.reviewHighlights,
      contentHash: args.contentHash,
      generatedAt: now,
      aiStatus: args.status,
    };

    if (existing) {
      await ctx.db.patch(existing._id, intelligenceData);
    } else {
      await ctx.db.insert("productIntelligence", {
        productId: args.productId,
        ...intelligenceData,
      });
    }

    await ctx.db.patch(args.productId, {
      embedding: args.embedding,
      embeddingStatus: args.status === "complete" ? "complete" : "failed",
      embeddingContentHash: args.contentHash,
      embeddingUpdatedAt: now,
    });

    return null;
  },
});

export const scheduleBackfill = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    await ctx.scheduler.runAfter(0, internal.productAiActions.backfillAllProducts, {
      cursor: 0,
    });
    return null;
  },
});

export const retryProductIntelligence = mutation({
  args: { productId: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.scheduler.runAfter(
      0,
      internal.productAiActions.processProductIntelligence,
      { productId: args.productId, force: true }
    );
    return null;
  },
});

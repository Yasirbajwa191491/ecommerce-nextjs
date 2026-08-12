import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/requireAdmin";
import { scheduleImageEmbeddingIfNeeded } from "./lib/ai/scheduleImageEmbedding";
import { IMAGE_EMBEDDING_BATCH_SIZE } from "./lib/ai/scheduleImageEmbedding";

export const enqueueImageEmbedding = internalMutation({
  args: {
    productId: v.id("products"),
    force: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await scheduleImageEmbeddingIfNeeded(ctx, args.productId, {
      force: args.force,
    });
    return null;
  },
});

export const scheduleBackfill = mutation({
  args: { limit: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? IMAGE_EMBEDDING_BATCH_SIZE, 50);
    await ctx.scheduler.runAfter(0, internal.imageEmbeddingActions.backfillImageEmbeddings, {
      limit,
    });
    return null;
  },
});

export const retryFailed = mutation({
  args: { productId: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await scheduleImageEmbeddingIfNeeded(ctx, args.productId, { force: true });
    return null;
  },
});

export const rebuildAll = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    await ctx.scheduler.runAfter(0, internal.imageEmbeddingActions.backfillImageEmbeddings, {
      limit: 100,
    });
    return null;
  },
});

import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/requireAdmin";
import { aiAnalysisStatusValidator } from "./lib/aiValidators";
import {
  IMAGE_EMBEDDING_CLIP_DIMENSIONS,
  IMAGE_EMBEDDING_SIGLIP_DIMENSIONS,
  IMAGE_EMBEDDING_VERSION,
} from "./lib/ai/constants";

export const setImageEmbeddingStatus = internalMutation({
  args: {
    productId: v.id("products"),
    status: aiAnalysisStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return null;
    await ctx.db.patch(args.productId, { imageEmbeddingStatus: args.status });
    return null;
  },
});

export const applyImageEmbedding = internalMutation({
  args: {
    productId: v.id("products"),
    embedding: v.array(v.float64()),
    provider: v.union(v.literal("siglip"), v.literal("clip")),
    model: v.string(),
    contentHash: v.string(),
    jobId: v.optional(v.id("imageEmbeddingJobs")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return null;

    const now = Date.now();
    const patch: Record<string, unknown> = {
      imageEmbeddingProvider: args.provider,
      imageEmbeddingVersion: IMAGE_EMBEDDING_VERSION,
      imageEmbeddingUpdatedAt: now,
      imageEmbeddingContentHash: args.contentHash,
      imageEmbeddingStatus: "complete",
    };

    if (args.provider === "siglip") {
      if (args.embedding.length !== IMAGE_EMBEDDING_SIGLIP_DIMENSIONS) {
        throw new Error("Invalid SigLIP embedding dimensions");
      }
      patch.imageEmbedding = args.embedding;
    } else {
      if (args.embedding.length !== IMAGE_EMBEDDING_CLIP_DIMENSIONS) {
        throw new Error("Invalid CLIP embedding dimensions");
      }
      patch.imageEmbeddingClip = args.embedding;
    }

    await ctx.db.patch(args.productId, patch);

    if (args.jobId) {
      const job = await ctx.db.get(args.jobId);
      if (job) {
        await ctx.db.patch(args.jobId, {
          status: "complete",
          provider: args.provider,
          updatedAt: now,
          completedAt: now,
        });
      }
    }

    return null;
  },
});

export const markImageEmbeddingJobFailed = internalMutation({
  args: {
    jobId: v.id("imageEmbeddingJobs"),
    error: v.string(),
    scheduleRetry: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;

    const now = Date.now();
    const attempts = job.attempts + 1;
    const canRetry =
      args.scheduleRetry !== false && attempts < job.maxAttempts;

    await ctx.db.patch(args.jobId, {
      attempts,
      error: args.error,
      status: canRetry ? "retry_scheduled" : "failed",
      nextRetryAt: canRetry ? now + 60_000 * attempts : undefined,
      updatedAt: now,
    });

    await ctx.db.patch(job.productId, {
      imageEmbeddingStatus: canRetry ? "retry_scheduled" : "failed",
    });

    if (canRetry) {
      await ctx.scheduler.runAfter(
        60_000 * attempts,
        internal.imageEmbeddingActions.processJobById,
        { jobId: args.jobId }
      );
    }

    return null;
  },
});

export const markJobCompleteOnly = internalMutation({
  args: {
    jobId: v.id("imageEmbeddingJobs"),
    completedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    await ctx.db.patch(args.jobId, {
      status: "complete",
      updatedAt: args.completedAt,
      completedAt: args.completedAt,
    });
    return null;
  },
});

export const claimImageEmbeddingJob = internalMutation({
  args: { jobId: v.id("imageEmbeddingJobs") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return false;
    if (job.status === "complete" || job.status === "processing") {
      return job.status === "processing";
    }

    await ctx.db.patch(args.jobId, {
      status: "processing",
      updatedAt: Date.now(),
    });
    await ctx.db.patch(job.productId, { imageEmbeddingStatus: "processing" });
    return true;
  },
});

export const setCachedVisualSearchEmbedding = internalMutation({
  args: {
    imageHash: v.string(),
    embedding: v.array(v.float64()),
    provider: v.string(),
    dimensions: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("visualSearchImageCache")
      .withIndex("by_image_hash", (q) => q.eq("imageHash", args.imageHash))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        embedding: args.embedding,
        provider: args.provider,
        dimensions: args.dimensions,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert("visualSearchImageCache", {
        imageHash: args.imageHash,
        embedding: args.embedding,
        provider: args.provider,
        dimensions: args.dimensions,
        createdAt: Date.now(),
      });
    }
    return null;
  },
});

export const logVisualSearchEvent = internalMutation({
  args: {
    sessionId: v.optional(v.string()),
    provider: v.string(),
    resultCount: v.number(),
    fallbackUsed: v.optional(v.string()),
    source: v.optional(
      v.union(v.literal("header"), v.literal("catalog"), v.literal("visual"))
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("visualSearchEvents", {
      sessionId: args.sessionId,
      provider: args.provider,
      resultCount: args.resultCount,
      fallbackUsed: args.fallbackUsed,
      searchedAt: Date.now(),
      source: args.source ?? "visual",
    });
    return null;
  },
});

export const getQueueStats = query({
  args: {},
  returns: v.object({
    pending: v.number(),
    processing: v.number(),
    retryScheduled: v.number(),
    failed: v.number(),
    complete: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const jobs = await ctx.db.query("imageEmbeddingJobs").take(5000);
    return {
      pending: jobs.filter((j) => j.status === "pending").length,
      processing: jobs.filter((j) => j.status === "processing").length,
      retryScheduled: jobs.filter((j) => j.status === "retry_scheduled").length,
      failed: jobs.filter((j) => j.status === "failed").length,
      complete: jobs.filter((j) => j.status === "complete").length,
    };
  },
});

export const listEmbeddingStatus = query({
  args: {
    status: v.optional(aiAnalysisStatusValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("products"),
      name: v.string(),
      imageEmbeddingStatus: v.optional(aiAnalysisStatusValidator),
      imageEmbeddingProvider: v.optional(v.string()),
      imageEmbeddingUpdatedAt: v.optional(v.number()),
      imageUrl: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 50, 100);
    const products = await ctx.db
      .query("products")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .take(500);

    const filtered = args.status
      ? products.filter((p) => p.imageEmbeddingStatus === args.status)
      : products;

    const { getPrimaryImageUrl } = await import("./lib/productImages");
    return filtered.slice(0, limit).map((p) => ({
      _id: p._id,
      name: p.name,
      imageEmbeddingStatus: p.imageEmbeddingStatus,
      imageEmbeddingProvider: p.imageEmbeddingProvider,
      imageEmbeddingUpdatedAt: p.imageEmbeddingUpdatedAt,
      imageUrl: getPrimaryImageUrl(p),
    }));
  },
});

export const getEmbeddingMetrics = query({
  args: {},
  returns: v.object({
    totalProducts: v.number(),
    withSiglip: v.number(),
    withClip: v.number(),
    pending: v.number(),
    failed: v.number(),
    complete: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const products = await ctx.db
      .query("products")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .take(2000);

    return {
      totalProducts: products.length,
      withSiglip: products.filter((p) => p.imageEmbedding != null).length,
      withClip: products.filter((p) => p.imageEmbeddingClip != null).length,
      pending: products.filter(
        (p) =>
          p.imageEmbeddingStatus === "pending" ||
          p.imageEmbeddingStatus === "processing"
      ).length,
      failed: products.filter((p) => p.imageEmbeddingStatus === "failed")
        .length,
      complete: products.filter((p) => p.imageEmbeddingStatus === "complete")
        .length,
    };
  },
});

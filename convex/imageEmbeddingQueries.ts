import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { getPrimaryImageUrl } from "./lib/productImages";
import { computeImageContentHash } from "./lib/ai/imageEmbeddingHelpers";

export const getQueueStatsInternal = internalQuery({
  args: {},
  returns: v.object({
    pending: v.number(),
    processing: v.number(),
    retryScheduled: v.number(),
    failed: v.number(),
    complete: v.number(),
  }),
  handler: async (ctx) => {
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

export const getProductForImageEmbedding = internalQuery({
  args: { productId: v.id("products") },
  returns: v.union(
    v.null(),
    v.object({
      productId: v.id("products"),
      imageUrl: v.string(),
      contentHash: v.string(),
      imageEmbeddingContentHash: v.optional(v.string()),
      jobStatus: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.active === false) return null;

    const contentHash = computeImageContentHash(product);
    if (!contentHash) return null;

    const imageUrl = getPrimaryImageUrl(product);
    if (!imageUrl) return null;

    return {
      productId: args.productId,
      imageUrl,
      contentHash,
      imageEmbeddingContentHash: product.imageEmbeddingContentHash,
      jobStatus: product.imageEmbeddingStatus,
    };
  },
});

export const getDueJobs = internalQuery({
  args: { limit: v.number() },
  returns: v.array(
    v.object({
      _id: v.id("imageEmbeddingJobs"),
      productId: v.id("products"),
      status: v.string(),
      attempts: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = Math.min(args.limit, 50);

    const retryJobs = await ctx.db
      .query("imageEmbeddingJobs")
      .withIndex("by_status_next_retry", (q) =>
        q.eq("status", "retry_scheduled")
      )
      .take(limit * 2);

    const dueRetry = retryJobs
      .filter((j) => (j.nextRetryAt ?? 0) <= now)
      .slice(0, limit);

    if (dueRetry.length >= limit) {
      return dueRetry.map((j) => ({
        _id: j._id,
        productId: j.productId,
        status: j.status,
        attempts: j.attempts,
      }));
    }

    const pending = await ctx.db
      .query("imageEmbeddingJobs")
      .withIndex("by_status_created", (q) => q.eq("status", "pending"))
      .take(limit - dueRetry.length);

    return [...dueRetry, ...pending].map((j) => ({
      _id: j._id,
      productId: j.productId,
      status: j.status,
      attempts: j.attempts,
    }));
  },
});

export const getJobById = internalQuery({
  args: { jobId: v.id("imageEmbeddingJobs") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("imageEmbeddingJobs"),
      productId: v.id("products"),
      status: v.string(),
      attempts: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    return {
      _id: job._id,
      productId: job.productId,
      status: job.status,
      attempts: job.attempts,
    };
  },
});

export const listProductsNeedingImageEmbedding = internalQuery({
  args: { limit: v.number() },
  returns: v.array(v.id("products")),
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .take(500);

    const needing = products.filter(
      (p) =>
        !p.imageEmbeddingStatus ||
        p.imageEmbeddingStatus === "failed" ||
        p.imageEmbeddingStatus === "pending"
    );

    return needing.slice(0, args.limit).map((p) => p._id);
  },
});

export const getCachedVisualSearchEmbedding = internalQuery({
  args: { imageHash: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      embedding: v.array(v.float64()),
      provider: v.string(),
      dimensions: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("visualSearchImageCache")
      .withIndex("by_image_hash", (q) => q.eq("imageHash", args.imageHash))
      .unique();

    if (!row) return null;
    const { VISUAL_SEARCH_CACHE_TTL_MS } = await import(
      "./lib/ai/constants"
    );
    if (Date.now() - row.createdAt > VISUAL_SEARCH_CACHE_TTL_MS) return null;

    return {
      embedding: row.embedding,
      provider: row.provider,
      dimensions: row.dimensions,
    };
  },
});

export const getProviderHealthRows = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      provider: v.string(),
      status: v.union(
        v.literal("healthy"),
        v.literal("degraded"),
        v.literal("down")
      ),
      failureCount: v.number(),
      consecutiveFailures: v.number(),
      lastSuccessAt: v.optional(v.number()),
      lastFailureAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const rows = await ctx.db.query("providerHealth").take(20);
    return rows.map((r) => ({
      provider: r.provider,
      status: r.status,
      failureCount: r.failureCount,
      consecutiveFailures: r.consecutiveFailures,
      lastSuccessAt: r.lastSuccessAt,
      lastFailureAt: r.lastFailureAt,
    }));
  },
});

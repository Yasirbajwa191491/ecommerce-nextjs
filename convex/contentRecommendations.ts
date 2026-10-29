import { internalMutation, internalQuery, query } from "./server";
import { internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import {
  appendContentSnapshotBatch,
  cleanupContentSnapshots,
  contentRecommendationStatus,
  createContentSnapshot,
  failContentSnapshot,
  loadCatalogExportPage,
  publishContentSnapshot,
  resolveContentRecommendations,
} from "./lib/recommendations/contentRecommendationStore";

const catalogExportRecordValidator = v.object({
  product_id: v.string(),
  name: v.string(),
  company: v.string(),
  category_name: v.string(),
  category_slug: v.string(),
  description: v.string(),
  colors: v.array(v.string()),
  seo_keywords: v.array(v.string()),
  highlights: v.array(v.string()),
  price: v.number(),
  currency: v.union(v.string(), v.null()),
  discount_percent: v.union(v.number(), v.null()),
  stock: v.number(),
  active: v.boolean(),
  featured: v.boolean(),
  stars: v.number(),
  reviews: v.number(),
  sku: v.union(v.string(), v.null()),
  data_origin: v.literal("real_catalog"),
});

const catalogPageValidator = v.object({
  page: v.array(catalogExportRecordValidator),
  skipped: v.number(),
  continueCursor: v.string(),
  isDone: v.boolean(),
});

const publishedSnapshotValidator = v.union(
  v.null(),
  v.object({
    snapshotId: v.string(),
    status: v.union(
      v.literal("staging"),
      v.literal("published"),
      v.literal("failed"),
      v.literal("archived")
    ),
    modelVersion: v.string(),
    artifactVersion: v.string(),
    datasetFingerprint: v.string(),
    datasetSource: v.union(v.literal("synthetic"), v.literal("real_catalog")),
    storedProductCount: v.number(),
    expectedProductCount: v.number(),
    generatedAt: v.number(),
    publishedAt: v.union(v.number(), v.null()),
    stale: v.boolean(),
  })
);

export const contentRecommendationStatusValidator = v.object({
  recommendationStrategy: v.union(v.literal("convex"), v.literal("python_content")),
  fallbackStrategy: v.literal("convex"),
  pythonModelVersion: v.string(),
  availableStrategies: v.array(v.union(v.literal("convex"), v.literal("python_content"))),
  publishedSnapshot: publishedSnapshotValidator,
});

const resolvedValidator = v.object({
  applied: v.boolean(),
  strategy: v.union(v.literal("convex"), v.literal("python_content")),
  productIds: v.array(v.id("products")),
  products: v.array(
    v.object({
      productId: v.id("products"),
      score: v.number(),
    })
  ),
});

const snapshotArgs = {
  snapshotId: v.string(),
  modelVersion: v.string(),
  artifactVersion: v.string(),
  datasetFingerprint: v.string(),
  datasetSource: v.union(v.literal("synthetic"), v.literal("real_catalog")),
  expectedProductCount: v.number(),
  topK: v.number(),
  generatedAt: v.number(),
};

export const exportCatalogPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: catalogPageValidator,
  handler: async (ctx, args) => {
    return await loadCatalogExportPage(ctx, args.paginationOpts);
  },
});

export const resolveForProduct = internalQuery({
  args: {
    productId: v.id("products"),
    limit: v.optional(v.number()),
  },
  returns: resolvedValidator,
  handler: async (ctx, args) => {
    return await resolveContentRecommendations(ctx, args);
  },
});

export const getContentSimilarProducts = query({
  args: {
    productId: v.id("products"),
    limit: v.optional(v.number()),
  },
  returns: resolvedValidator,
  handler: async (ctx, args) => {
    return await resolveContentRecommendations(ctx, args);
  },
});

export const getStatusInternal = internalQuery({
  args: { now: v.number() },
  returns: contentRecommendationStatusValidator,
  handler: async (ctx, args) => {
    if (!Number.isFinite(args.now) || args.now <= 0) {
      throw new ConvexError("now is invalid");
    }
    return await contentRecommendationStatus(ctx, args.now);
  },
});

export const createSnapshot = internalMutation({
  args: snapshotArgs,
  returns: v.string(),
  handler: async (ctx, args) => {
    return await createContentSnapshot(ctx, args);
  },
});

export const appendBatch = internalMutation({
  args: {
    snapshotId: v.string(),
    rows: v.array(
      v.object({
        productId: v.id("products"),
        recommendedProductIds: v.array(v.id("products")),
        scores: v.array(v.number()),
      })
    ),
  },
  returns: v.object({ storedProductCount: v.number() }),
  handler: async (ctx, args) => {
    return await appendContentSnapshotBatch(ctx, args);
  },
});

export const publishSnapshot = internalMutation({
  args: { snapshotId: v.string() },
  returns: v.object({ snapshotId: v.string(), publishedAt: v.number() }),
  handler: async (ctx, args) => {
    return await publishContentSnapshot(ctx, args.snapshotId);
  },
});

export const failSnapshot = internalMutation({
  args: { snapshotId: v.string(), error: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    return await failContentSnapshot(ctx, args.snapshotId, args.error);
  },
});

export const cleanupSnapshots = internalMutation({
  args: {},
  returns: v.object({ scheduled: v.boolean() }),
  handler: async (ctx) => {
    const result = await cleanupContentSnapshots(ctx);
    if (result.scheduled) {
      await ctx.scheduler.runAfter(0, internal.contentRecommendations.cleanupSnapshots, {});
    }
    return result;
  },
});

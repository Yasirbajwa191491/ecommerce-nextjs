import { mutation, query } from "./server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { requireAdmin } from "./lib/requireAdmin";
import { clampCatalogPageSize } from "./lib/recommendations/catalogExport";
import { contentRecommendationStatusValidator } from "./contentRecommendations";
import {
  appendContentSnapshotBatch,
  assertPublishedSnapshotForStrategy,
  cleanupContentSnapshots,
  contentRecommendationStatus,
  createContentSnapshot,
  failContentSnapshot,
  loadCatalogExportPage,
  publishContentSnapshot,
} from "./lib/recommendations/contentRecommendationStore";
import {
  PYTHON_MODEL_VERSION_KEY,
  RECOMMENDATION_STRATEGY_FALLBACK_KEY,
  RECOMMENDATION_STRATEGY_KEY,
} from "./lib/recommendations/mlStrategy";

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

async function upsertSystemSetting(ctx: MutationCtx, key: string, name: string, value: string) {
  const existing = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
    return;
  }
  await ctx.db.insert("settings", {
    key,
    name,
    value,
    isSystem: true,
    updatedAt: Date.now(),
  });
}

export const getStatus = query({
  args: { now: v.number() },
  returns: contentRecommendationStatusValidator,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!Number.isFinite(args.now) || args.now <= 0) {
      throw new ConvexError("now is invalid");
    }
    return await contentRecommendationStatus(ctx, args.now);
  },
});

export const exportCatalogPage = query({
  args: {
    cursor: v.union(v.string(), v.null()),
    limit: v.number(),
  },
  returns: v.object({
    page: v.array(
      v.object({
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
      })
    ),
    skipped: v.number(),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await loadCatalogExportPage(ctx, {
      numItems: clampCatalogPageSize(args.limit),
      cursor: args.cursor,
    });
  },
});

export const setRecommendationStrategy = mutation({
  args: {
    recommendationStrategy: v.union(v.literal("convex"), v.literal("python_content")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.recommendationStrategy === "python_content") {
      try {
        await assertPublishedSnapshotForStrategy(ctx);
      } catch (error) {
        throw new ConvexError(error instanceof Error ? error.message : "Snapshot required");
      }
    }
    await upsertSystemSetting(
      ctx,
      RECOMMENDATION_STRATEGY_KEY,
      "Recommendation Strategy",
      args.recommendationStrategy
    );
    await upsertSystemSetting(
      ctx,
      RECOMMENDATION_STRATEGY_FALLBACK_KEY,
      "Recommendation Strategy Fallback",
      "convex"
    );
    await upsertSystemSetting(
      ctx,
      PYTHON_MODEL_VERSION_KEY,
      "Python Content Model Version",
      "content-v1"
    );
    return null;
  },
});

export const createSnapshot = mutation({
  args: snapshotArgs,
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await createContentSnapshot(ctx, args);
  },
});

export const appendBatch = mutation({
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
    await requireAdmin(ctx);
    return await appendContentSnapshotBatch(ctx, args);
  },
});

export const publishSnapshot = mutation({
  args: { snapshotId: v.string() },
  returns: v.object({ snapshotId: v.string(), publishedAt: v.number() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await publishContentSnapshot(ctx, args.snapshotId);
  },
});

export const failSnapshot = mutation({
  args: { snapshotId: v.string(), error: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await failContentSnapshot(ctx, args.snapshotId, args.error);
  },
});

export const cleanupOldSnapshots = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const result = await cleanupContentSnapshots(ctx);
    if (result.scheduled) {
      await ctx.scheduler.runAfter(0, internal.contentRecommendations.cleanupSnapshots, {});
    }
    return null;
  },
});

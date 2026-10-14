import { ConvexError } from "convex/values";
import type { PaginationOptions } from "convex/server";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { isProductActive } from "../productActive";
import { toCatalogExportRecord, type CatalogExportRecord } from "./catalogExport";
import {
  CLEANUP_ITEM_BATCH,
  clampRecommendationLimit,
  publishBlockReason,
  resolvePrecomputedRecommendations,
  snapshotCreateError,
  snapshotIsStale,
  validateImportRows,
  type SnapshotCreateInput,
} from "./contentSnapshot";
import {
  DEFAULT_PYTHON_MODEL_VERSION,
  DEFAULT_RECOMMENDATION_STRATEGY,
  DEFAULT_STRATEGY_FALLBACK,
  parseRecommendationStrategy,
  PYTHON_MODEL_VERSION_KEY,
  RECOMMENDATION_STRATEGY_FALLBACK_KEY,
  RECOMMENDATION_STRATEGY_KEY,
  type RecommendationStrategy,
} from "./mlStrategy";
import { getRecommendationSettings } from "./settings";

type DbCtx = QueryCtx | MutationCtx;

async function readSetting(ctx: DbCtx, key: string, fallback: string): Promise<string> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  return row?.value ?? fallback;
}

function pickPublished<T extends { publishedAt?: number; snapshotId: string }>(rows: T[]): T | null {
  if (rows.length === 0) return null;
  return (
    [...rows].sort(
      (left, right) =>
        (right.publishedAt ?? 0) - (left.publishedAt ?? 0) ||
        left.snapshotId.localeCompare(right.snapshotId)
    )[0] ?? null
  );
}

export async function loadCatalogExportPage(ctx: QueryCtx, paginationOpts: PaginationOptions) {
  const result = await ctx.db.query("products").withIndex("by_name").paginate(paginationOpts);
  const page: CatalogExportRecord[] = [];
  let skipped = 0;
  for (const product of result.page) {
    const category = await ctx.db.get(product.categoryId);
    const record = toCatalogExportRecord(product, category);
    if (!record) {
      skipped += 1;
      continue;
    }
    page.push(record);
  }
  return {
    page,
    skipped,
    continueCursor: result.continueCursor,
    isDone: result.isDone,
  };
}

const PUBLISHED_READ_LIMIT = 32;

export async function publishedContentSnapshot(ctx: DbCtx) {
  const rows = await ctx.db
    .query("contentRecommendationSnapshots")
    .withIndex("by_status", (q) => q.eq("status", "published"))
    .take(PUBLISHED_READ_LIMIT);
  return pickPublished(rows);
}

export async function assertPublishedSnapshotForStrategy(ctx: DbCtx): Promise<void> {
  const published = await publishedContentSnapshot(ctx);
  if (!published) {
    throw new Error("Publish a content recommendation snapshot before selecting python_content");
  }
}

export async function resolveContentRecommendations(
  ctx: QueryCtx,
  args: { productId: Id<"products">; limit?: number }
) {
  const strategy = parseRecommendationStrategy(
    await readSetting(ctx, RECOMMENDATION_STRATEGY_KEY, DEFAULT_RECOMMENDATION_STRATEGY)
  );
  const empty = {
    applied: false as const,
    strategy,
    productIds: [] as Id<"products">[],
    products: [] as Array<{ productId: Id<"products">; score: number }>,
  };
  if (strategy !== "python_content") return empty;

  const source = await ctx.db.get(args.productId);
  if (!source || !isProductActive(source)) return empty;

  const snapshot = await publishedContentSnapshot(ctx);
  const modelVersion = (
    await readSetting(ctx, PYTHON_MODEL_VERSION_KEY, DEFAULT_PYTHON_MODEL_VERSION)
  ).trim();
  if (!snapshot || snapshot.modelVersion !== modelVersion) return empty;

  const item = await ctx.db
    .query("contentRecommendationItems")
    .withIndex("by_snapshot_and_product", (q) =>
      q.eq("snapshotId", snapshot.snapshotId).eq("productId", args.productId)
    )
    .unique();
  if (!item) return empty;

  const activeProductIds = new Set<string>();
  for (const productId of item.recommendedProductIds) {
    const product = await ctx.db.get(productId);
    if (product && isProductActive(product)) activeProductIds.add(product._id);
  }
  const resolved = resolvePrecomputedRecommendations({
    strategy,
    limit: clampRecommendationLimit(args.limit),
    sourceProductId: args.productId,
    row: {
      recommendedProductIds: item.recommendedProductIds,
      scores: item.scores,
    },
    activeProductIds,
  });
  if (!resolved.applied) return empty;
  const products = resolved.products.map((product) => ({
    productId: product.productId as Id<"products">,
    score: product.score,
  }));
  return {
    applied: true as const,
    strategy,
    productIds: products.map((product) => product.productId),
    products,
  };
}

export async function contentRecommendationStatus(ctx: QueryCtx, now: number) {
  const settings = await getRecommendationSettings(ctx);
  const strategy = parseRecommendationStrategy(
    await readSetting(ctx, RECOMMENDATION_STRATEGY_KEY, DEFAULT_RECOMMENDATION_STRATEGY)
  );
  const storedFallback = parseRecommendationStrategy(
    await readSetting(ctx, RECOMMENDATION_STRATEGY_FALLBACK_KEY, DEFAULT_STRATEGY_FALLBACK)
  );
  const fallbackStrategy: "convex" = storedFallback === "convex" ? "convex" : "convex";
  const pythonModelVersion = (
    await readSetting(ctx, PYTHON_MODEL_VERSION_KEY, DEFAULT_PYTHON_MODEL_VERSION)
  ).trim();
  const published = await publishedContentSnapshot(ctx);
  return {
    recommendationStrategy: strategy,
    fallbackStrategy,
    pythonModelVersion: pythonModelVersion || DEFAULT_PYTHON_MODEL_VERSION,
    availableStrategies: ["convex", "python_content"] as RecommendationStrategy[],
    publishedSnapshot: published
      ? {
          snapshotId: published.snapshotId,
          status: published.status,
          modelVersion: published.modelVersion,
          artifactVersion: published.artifactVersion,
          datasetFingerprint: published.datasetFingerprint,
          datasetSource: published.datasetSource,
          storedProductCount: published.storedProductCount,
          expectedProductCount: published.expectedProductCount,
          generatedAt: published.generatedAt,
          publishedAt: published.publishedAt ?? null,
          stale: snapshotIsStale(published.generatedAt, now, settings.refreshHours),
        }
      : null,
  };
}

export async function createContentSnapshot(ctx: MutationCtx, input: SnapshotCreateInput) {
  const reason = snapshotCreateError(input);
  if (reason) throw new ConvexError(reason);
  const existing = await ctx.db
    .query("contentRecommendationSnapshots")
    .withIndex("by_snapshot_id", (q) => q.eq("snapshotId", input.snapshotId))
    .unique();
  if (existing) throw new ConvexError("Snapshot id already exists");
  await ctx.db.insert("contentRecommendationSnapshots", {
    ...input,
    status: "staging",
    storedProductCount: 0,
  });
  return input.snapshotId;
}

export async function appendContentSnapshotBatch(
  ctx: MutationCtx,
  args: {
    snapshotId: string;
    rows: Array<{
      productId: Id<"products">;
      recommendedProductIds: Id<"products">[];
      scores: number[];
    }>;
  }
) {
  const snapshot = await ctx.db
    .query("contentRecommendationSnapshots")
    .withIndex("by_snapshot_id", (q) => q.eq("snapshotId", args.snapshotId))
    .unique();
  if (!snapshot) throw new ConvexError("Snapshot not found");
  if (snapshot.status !== "staging") throw new ConvexError("Snapshot is not staging");
  const reason = validateImportRows(args.rows, snapshot.topK);
  if (reason) throw new ConvexError(reason);
  if (snapshot.storedProductCount + args.rows.length > snapshot.expectedProductCount) {
    throw new ConvexError("Snapshot batch exceeds the expected product count");
  }

  for (const row of args.rows) {
    const source = await ctx.db.get(row.productId);
    if (!source) throw new ConvexError("Unknown product in recommendation batch");
    for (const productId of row.recommendedProductIds) {
      const target = await ctx.db.get(productId);
      if (!target) throw new ConvexError("Unknown recommended product");
    }
    const existing = await ctx.db
      .query("contentRecommendationItems")
      .withIndex("by_snapshot_and_product", (q) =>
        q.eq("snapshotId", args.snapshotId).eq("productId", row.productId)
      )
      .unique();
    if (existing) throw new ConvexError("Duplicate source product in snapshot");
    await ctx.db.insert("contentRecommendationItems", {
      snapshotId: args.snapshotId,
      productId: row.productId,
      recommendedProductIds: row.recommendedProductIds,
      scores: row.scores,
      modelVersion: snapshot.modelVersion,
      artifactVersion: snapshot.artifactVersion,
      generatedAt: snapshot.generatedAt,
    });
  }

  await ctx.db.patch(snapshot._id, {
    storedProductCount: snapshot.storedProductCount + args.rows.length,
  });
  return { storedProductCount: snapshot.storedProductCount + args.rows.length };
}

export async function publishContentSnapshot(ctx: MutationCtx, snapshotId: string) {
  const snapshot = await ctx.db
    .query("contentRecommendationSnapshots")
    .withIndex("by_snapshot_id", (q) => q.eq("snapshotId", snapshotId))
    .unique();
  if (!snapshot) throw new ConvexError("Snapshot not found");
  const reason = publishBlockReason(snapshot);
  if (reason) throw new ConvexError(reason);
  for (let pass = 0; pass < 32; pass += 1) {
    const published = await ctx.db
      .query("contentRecommendationSnapshots")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(8);
    if (published.length === 0) break;
    for (const row of published) {
      await ctx.db.patch(row._id, { status: "archived" });
    }
    if (published.length < 8) break;
  }
  const publishedAt = Date.now();
  await ctx.db.patch(snapshot._id, { status: "published", publishedAt });
  return { snapshotId, publishedAt };
}

export async function failContentSnapshot(ctx: MutationCtx, snapshotId: string, error: string) {
  const snapshot = await ctx.db
    .query("contentRecommendationSnapshots")
    .withIndex("by_snapshot_id", (q) => q.eq("snapshotId", snapshotId))
    .unique();
  if (!snapshot) throw new ConvexError("Snapshot not found");
  if (snapshot.status === "published") {
    throw new ConvexError("Refusing to fail the published snapshot");
  }
  if (snapshot.status !== "staging") throw new ConvexError("Snapshot is not staging");
  await ctx.db.patch(snapshot._id, {
    status: "failed",
    error: error.slice(0, 300),
  });
  return snapshotId;
}

export async function cleanupContentSnapshots(ctx: MutationCtx) {
  const published = await ctx.db
    .query("contentRecommendationSnapshots")
    .withIndex("by_status", (q) => q.eq("status", "published"))
    .take(8);
  const publishedIds = new Set(published.map((row) => row.snapshotId));
  const archived = await ctx.db
    .query("contentRecommendationSnapshots")
    .withIndex("by_status", (q) => q.eq("status", "archived"))
    .take(1);
  const failed = await ctx.db
    .query("contentRecommendationSnapshots")
    .withIndex("by_status", (q) => q.eq("status", "failed"))
    .take(1);
  const candidate = [...archived, ...failed].find((row) => !publishedIds.has(row.snapshotId));
  if (!candidate || candidate.status === "published") {
    return { scheduled: false };
  }
  const items = await ctx.db
    .query("contentRecommendationItems")
    .withIndex("by_snapshot", (q) => q.eq("snapshotId", candidate.snapshotId))
    .take(CLEANUP_ITEM_BATCH);
  for (const item of items) {
    await ctx.db.delete(item._id);
  }
  if (items.length === CLEANUP_ITEM_BATCH) return { scheduled: true };
  await ctx.db.delete(candidate._id);
  return { scheduled: true };
}

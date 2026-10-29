import { internalMutation, internalQuery } from "./server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { FAQ_ITEMS } from "./lib/storeGuideContent";
import { plainTextFromSetting } from "./lib/rag/content";
import { productFact, productSourcePayload } from "./lib/rag/sources";
import { RAG_INDEX_VERSION } from "./lib/rag/config";

const sourceType = v.union(
  v.literal("product"),
  v.literal("shipping_policy"),
  v.literal("return_policy"),
  v.literal("privacy_policy"),
  v.literal("terms"),
  v.literal("faq")
);

const chunkValidator = v.object({
  chunkId: v.string(),
  documentId: v.string(),
  sourceType,
  sourceId: v.string(),
  productId: v.optional(v.string()),
  title: v.string(),
  section: v.string(),
  content: v.string(),
  contentHash: v.string(),
  metadataJson: v.string(),
  embedding: v.array(v.float64()),
  embeddingVersion: v.string(),
});

export const pageActiveProducts = internalQuery({
  args: { cursor: v.union(v.string(), v.null()), limit: v.number() },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("products")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .paginate({ numItems: Math.min(Math.max(args.limit, 1), 10), cursor: args.cursor });
    const products = [];
    for (const product of page.page) {
      const category = await ctx.db.get(product.categoryId);
      products.push(productSourcePayload(product, category?.name ?? "Product"));
    }
    return { products, continueCursor: page.continueCursor, isDone: page.isDone };
  },
});

export const getProductSource = internalQuery({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return null;
    const category = await ctx.db.get(product.categoryId);
    return {
      source: productSourcePayload(product, category?.name ?? "Product"),
      fact: productFact(product),
      documentId: `product:${product._id}`,
    };
  },
});

export const getFactsForProducts = internalQuery({
  args: { productIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const facts = [];
    for (const productId of args.productIds.slice(0, 20)) {
      try {
        const product = await ctx.db.get(productId as Id<"products">);
        if (!product) continue;
        facts.push(productFact(product));
      } catch {
        continue;
      }
    }
    return facts;
  },
});

export const getPolicyCorpus = internalQuery({
  args: {},
  handler: async (ctx) => {
    const keys = [
      ["shipping_policy", "shipping", "Shipping Policy"],
      ["return_policy", "return", "Return Policy"],
      ["privacy_policy", "privacy", "Privacy Policy"],
      ["terms_conditions", "terms", "Terms and Conditions"],
    ] as const;
    const policies = [];
    for (const [key, sourceId, title] of keys) {
      const row = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      const content = plainTextFromSetting(row?.value ?? "");
      if (!content) continue;
      policies.push({
        source_type: key === "terms_conditions" ? "terms" : key,
        source_id: sourceId,
        title,
        content,
        active: true,
      });
    }
    const faqs = FAQ_ITEMS.map((item) => ({
      source_id: item.question
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80),
      question: item.question,
      answer: item.answer,
      active: true,
    }));
    return { policies, faqs };
  },
});

export const getIndexState = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("ragIndexState")
      .withIndex("by_version", (q) => q.eq("indexVersion", RAG_INDEX_VERSION))
      .unique();
  },
});

export const getSettingValue = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    return row?.value ?? null;
  },
});

export const searchChunks = internalQuery({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("ragChunks")
      .withSearchIndex("search_content", (q) => q.search("content", args.query).eq("active", true))
      .take(20);
    return rows.map((row, index) => ({
      chunk_id: row.chunkId,
      document_id: row.documentId,
      source_type: row.sourceType,
      source_id: row.sourceId,
      product_id: row.productId ?? null,
      title: row.title,
      section: row.section,
      content: row.content,
      metadata: safeMetadata(row.metadataJson),
      score: 1 / (index + 1),
    }));
  },
});

export const getChunksByIds = internalQuery({
  args: { ids: v.array(v.id("ragChunks")) },
  handler: async (ctx, args) => {
    const chunks = [];
    for (const id of args.ids.slice(0, 20)) {
      const row = await ctx.db.get(id);
      if (!row?.active) continue;
      chunks.push(row);
    }
    return chunks;
  },
});

export const hashesForDocument = internalQuery({
  args: { documentId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("ragChunks")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .take(40);
    return rows.map((row) => ({
      chunkId: row.chunkId,
      contentHash: row.contentHash,
      embeddingVersion: row.embeddingVersion,
    }));
  },
});

const reindexStatusValidator = v.union(
  v.literal("idle"),
  v.literal("running"),
  v.literal("unchanged"),
  v.literal("complete"),
  v.literal("partial"),
  v.literal("failed")
);

export const markReindexStatus = internalMutation({
  args: {
    embeddingVersion: v.string(),
    reindexStatus: reindexStatusValidator,
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("ragIndexState")
      .withIndex("by_version", (q) => q.eq("indexVersion", RAG_INDEX_VERSION))
      .unique();
    if (!state) return;
    await ctx.db.patch(state._id, {
      reindexStatus: args.reindexStatus,
      updatedAt: Date.now(),
    });
  },
});

export const reconcileChunks = internalMutation({
  args: {
    documentIds: v.array(v.string()),
    retainChunkIds: v.array(v.string()),
    chunks: v.array(chunkValidator),
    embeddingVersion: v.string(),
    reindexStatus: reindexStatusValidator,
  },
  handler: async (ctx, args) => {
    const retain = new Set(args.retainChunkIds);
    for (const documentId of args.documentIds.slice(0, 40)) {
      const existing = await ctx.db
        .query("ragChunks")
        .withIndex("by_document", (q) => q.eq("documentId", documentId))
        .take(40);
      for (const row of existing) {
        if (!retain.has(row.chunkId)) await ctx.db.delete(row._id);
      }
    }
    const now = Date.now();
    let skipped = 0;
    for (const chunk of args.chunks.slice(0, 80)) {
      if (chunk.embedding.length !== 384) {
        skipped += 1;
        continue;
      }
      const existing = await ctx.db
        .query("ragChunks")
        .withIndex("by_chunk_id", (q) => q.eq("chunkId", chunk.chunkId))
        .unique();
      if (existing) await ctx.db.delete(existing._id);
      await ctx.db.insert("ragChunks", {
        ...chunk,
        visibility: "public",
        indexVersion: RAG_INDEX_VERSION,
        active: true,
        updatedAt: now,
      });
    }
    const state = await ctx.db
      .query("ragIndexState")
      .withIndex("by_version", (q) => q.eq("indexVersion", RAG_INDEX_VERSION))
      .unique();
    const status = skipped > 0 ? "partial" : args.reindexStatus;
    if (state) {
      await ctx.db.patch(state._id, {
        embeddingVersion: args.embeddingVersion,
        reindexStatus: status,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("ragIndexState", {
        indexVersion: RAG_INDEX_VERSION,
        embeddingVersion: args.embeddingVersion,
        documentCount: args.documentIds.length,
        chunkCount: args.chunks.length,
        failedCount: skipped,
        reindexStatus: status,
        updatedAt: now,
      });
    }
  },
});

export const replaceChunks = internalMutation({
  args: {
    documentIds: v.array(v.string()),
    chunks: v.array(chunkValidator),
    embeddingVersion: v.string(),
    failed: v.array(v.object({ documentId: v.string(), error: v.string() })),
  },
  handler: async (ctx, args) => {
    for (const documentId of args.documentIds.slice(0, 40)) {
      const existing = await ctx.db
        .query("ragChunks")
        .withIndex("by_document", (q) => q.eq("documentId", documentId))
        .take(40);
      for (const row of existing) await ctx.db.delete(row._id);
    }
    const now = Date.now();
    for (const chunk of args.chunks.slice(0, 80)) {
      if (chunk.embedding.length !== 384) continue;
      await ctx.db.insert("ragChunks", {
        ...chunk,
        visibility: "public",
        indexVersion: RAG_INDEX_VERSION,
        active: true,
        updatedAt: now,
      });
    }
    for (const failure of args.failed.slice(0, 20)) {
      const existing = await ctx.db
        .query("ragIndexFailures")
        .withIndex("by_document", (q) => q.eq("documentId", failure.documentId))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          error: failure.error.slice(0, 180),
          attempts: existing.attempts + 1,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("ragIndexFailures", {
          documentId: failure.documentId,
          error: failure.error.slice(0, 180),
          attempts: 1,
          updatedAt: now,
        });
      }
    }
    const state = await ctx.db
      .query("ragIndexState")
      .withIndex("by_version", (q) => q.eq("indexVersion", RAG_INDEX_VERSION))
      .unique();
    const present = await ctx.db
      .query("ragChunks")
      .withIndex("by_active", (q) => q.eq("active", true))
      .take(1);
    const chunkCount = present.length > 0 ? 1 : 0;
    if (state) {
      await ctx.db.patch(state._id, {
        embeddingVersion: args.embeddingVersion,
        chunkCount,
        documentCount: chunkCount,
        failedCount: args.failed.length,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("ragIndexState", {
        indexVersion: RAG_INDEX_VERSION,
        embeddingVersion: args.embeddingVersion,
        documentCount: chunkCount,
        chunkCount,
        failedCount: args.failed.length,
        updatedAt: now,
      });
    }
  },
});

export const deactivateDocument = internalMutation({
  args: { documentId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("ragChunks")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .take(40);
    for (const row of rows) await ctx.db.patch(row._id, { active: false, updatedAt: Date.now() });
    return rows.length;
  },
});

export const readSession = internalQuery({
  args: { sessionKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ragSessions")
      .withIndex("by_session_key", (q) => q.eq("sessionKey", args.sessionKey))
      .unique();
  },
});

export const writeSession = internalMutation({
  args: {
    sessionKey: v.string(),
    turnsJson: v.string(),
    askCount: v.number(),
    windowStartedAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ragSessions")
      .withIndex("by_session_key", (q) => q.eq("sessionKey", args.sessionKey))
      .unique();
    const patch = { ...args, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert("ragSessions", patch);
  },
});

function safeMetadata(metadataJson: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(metadataJson);
    if (!parsed || typeof parsed !== "object") return {};
    const allowed: Record<string, string> = {};
    for (const key of ["brand", "category", "name", "section"]) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === "string") allowed[key] = value.slice(0, 200);
    }
    return allowed;
  } catch {
    return {};
  }
}

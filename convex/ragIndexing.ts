import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { embedRagTexts, probeRagEmbeddingVersion } from "./lib/rag/generate";
import { chunkNeedsReembedding, vectorsCompatible } from "./lib/rag/embeddingVersion";
import { EMBEDDING_DIMENSIONS } from "./lib/ai/constants";
import { defaultRagEnv, postRag, ragServiceConfigured } from "./lib/rag/pythonRagClient";
import { deploymentGateEnabled } from "./lib/rag/config";
import type { ProductSourcePayload } from "./lib/rag/sources";

type PreparedChunk = {
  chunk_id: string;
  document_id: string;
  source_type: "product" | "shipping_policy" | "return_policy" | "privacy_policy" | "terms" | "faq";
  source_id: string;
  product_id: string | null;
  title: string;
  section: string;
  content: string;
  metadata: Record<string, string>;
  content_hash: string;
};

type IndexBody = {
  products?: ProductSourcePayload[];
  policies?: unknown[];
  faqs?: unknown[];
  embedding_mode: "provided" | "hashing";
  embedding_version?: string;
  chunk_embeddings?: Record<string, number[]>;
  prune_document_ids?: string[];
};

function isChunk(value: unknown): value is PreparedChunk {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.chunk_id === "string" &&
    typeof row.document_id === "string" &&
    typeof row.content === "string" &&
    typeof row.content_hash === "string" &&
    typeof row.source_type === "string" &&
    typeof row.source_id === "string" &&
    typeof row.title === "string"
  );
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Indexing failed";
  return message.replace(/bearer\s+\S+/gi, "[redacted]").slice(0, 180);
}

async function indexBody(ctx: ActionCtx, body: IndexBody, documentIds: string[]) {
  const env = defaultRagEnv();
  const prepared = await postRag<{ chunks?: unknown[] }>("/api/v1/internal/rag/prepare", prepareRagPayload(body), env);
  const chunks = (prepared.chunks ?? []).filter(isChunk).slice(0, 40);
  const changed: PreparedChunk[] = [];
  let targetVersion: string | null = null;
  try {
    targetVersion = await probeRagEmbeddingVersion();
  } catch {
    targetVersion = null;
  }
  for (const chunk of chunks) {
    const existing = await ctx.runQuery(internal.ragData.hashesForDocument, {
      documentId: chunk.document_id,
    });
    const match = existing.find(
      (row: { chunkId: string; contentHash: string; embeddingVersion: string }) =>
        row.chunkId === chunk.chunk_id
    );
    if (
      chunkNeedsReembedding(
        match
          ? {
              chunkId: match.chunkId,
              contentHash: match.contentHash,
              embeddingVersion: match.embeddingVersion,
            }
          : undefined,
        chunk.content_hash,
        targetVersion
      )
    ) {
      changed.push(chunk);
    }
  }
  const uniqueChanged = changed.filter(
    (chunk, index, all) => all.findIndex((item) => item.chunk_id === chunk.chunk_id) === index
  );
  if (targetVersion === null && uniqueChanged.length > 0) {
    throw new Error("Embedding version is unknown");
  }
  if (uniqueChanged.length === 0) {
    await ctx.runMutation(internal.ragData.markReindexStatus, {
      embeddingVersion: targetVersion ?? "unchanged",
      reindexStatus: "unchanged",
    });
    return { chunks: 0, embeddingVersion: "unchanged" };
  }
  const embedded = await embedRagTexts(uniqueChanged.map((chunk) => chunk.content));
  if (targetVersion && embedded.version !== targetVersion) {
    throw new Error("Embedding version changed during indexing");
  }
  if (!vectorsCompatible(embedded.vectors, EMBEDDING_DIMENSIONS)) {
    throw new Error("Embedding dimension mismatch");
  }
  const embeddingVersion = embedded.version;
  const embeddings: Record<string, number[]> = {};
  uniqueChanged.forEach((chunk, index) => {
    embeddings[chunk.chunk_id] = embedded.vectors[index] ?? [];
  });
  await postRag(
    "/api/v1/internal/rag/index",
    {
      ...body,
      embedding_mode: "provided",
      embedding_version: embeddingVersion,
      chunk_embeddings: embeddings,
    },
    env
  );
  await ctx.runMutation(internal.ragData.reconcileChunks, {
    documentIds,
    retainChunkIds: chunks.map((chunk) => chunk.chunk_id),
    chunks: uniqueChanged.map((chunk) => ({
      chunkId: chunk.chunk_id,
      documentId: chunk.document_id,
      sourceType: chunk.source_type,
      sourceId: chunk.source_id,
      productId: chunk.product_id ?? undefined,
      title: chunk.title,
      section: chunk.section || chunk.title,
      content: chunk.content,
      contentHash: chunk.content_hash,
      metadataJson: JSON.stringify(chunk.metadata ?? {}),
      embedding: embeddings[chunk.chunk_id] ?? [],
      embeddingVersion,
    })),
    embeddingVersion,
    reindexStatus: "complete",
  });
  return { chunks: uniqueChanged.length, embeddingVersion };
}

export const reindexProduct = internalAction({
  args: { productId: v.id("products") },
  handler: async (ctx, args): Promise<
    { skipped: true } | { pruned: true } | { failed: true } | { chunks: number; embeddingVersion: string }
  > => {
    if (!deploymentGateEnabled(process.env.RAG_SHOPPING_ASSISTANT_ENABLED)) {
      return { skipped: true as const };
    }
    if (!ragServiceConfigured(defaultRagEnv())) return { skipped: true as const };
    const source = await ctx.runQuery(internal.ragData.getProductSource, {
      productId: args.productId,
    });
    if (!source) return { skipped: true as const };
    try {
      if (!source.source.active) {
        await ctx.runMutation(internal.ragData.deactivateDocument, {
          documentId: source.documentId,
        });
        await postRag(
          "/api/v1/internal/rag/index",
          { prune_document_ids: [source.documentId], embedding_mode: "hashing" },
          defaultRagEnv()
        );
        return { pruned: true as const };
      }
      return await indexBody(ctx, { products: [source.source], embedding_mode: "provided" }, [
        source.documentId,
      ]);
    } catch (error) {
      await ctx.runMutation(internal.ragData.replaceChunks, {
        documentIds: [],
        chunks: [],
        embeddingVersion: "failed",
        failed: [{ documentId: source.documentId, error: safeError(error) }],
      });
      return { failed: true as const };
    }
  },
});

export const reindexPolicies = internalAction({
  args: {},
  handler: async (ctx): Promise<{ skipped: true } | { chunks: number; embeddingVersion: string }> => {
    if (!deploymentGateEnabled(process.env.RAG_SHOPPING_ASSISTANT_ENABLED)) {
      return { skipped: true as const };
    }
    if (!ragServiceConfigured(defaultRagEnv())) return { skipped: true as const };
    const corpus = await ctx.runQuery(internal.ragData.getPolicyCorpus, {});
    const documentIds = [
      ...corpus.policies.map((policy: { source_type: string; source_id: string }) =>
        `${policy.source_type}:${policy.source_id}`
      ),
      ...corpus.faqs.map((faq: { source_id: string }) => `faq:${faq.source_id}`),
    ];
    return await indexBody(
      ctx,
      { policies: corpus.policies, faqs: corpus.faqs, embedding_mode: "provided" },
      documentIds
    );
  },
});

export const syncBatch = internalAction({
  args: { cursor: v.union(v.string(), v.null()), remaining: v.number() },
  handler: async (
    ctx,
    args
  ): Promise<{ skipped: true } | { indexed: number; done: boolean }> => {
    if (!ragServiceConfigured(defaultRagEnv())) {
      return { skipped: true as const };
    }
    const page = await ctx.runQuery(internal.ragData.pageActiveProducts, {
      cursor: args.cursor,
      limit: 8,
    });
    if (page.products.length > 0) {
      await indexBody(
        ctx,
        { products: page.products, embedding_mode: "provided" },
        page.products.map((product: ProductSourcePayload) => `product:${product.source_id}`)
      );
    }
    if (!page.isDone && args.remaining > 1) {
      await ctx.scheduler.runAfter(0, internal.ragIndexing.syncBatch, {
        cursor: page.continueCursor,
        remaining: args.remaining - 1,
      });
    }
    return { indexed: page.products.length, done: page.isDone };
  },
});

export function prepareRagPayload(body: IndexBody) {
  return { products: body.products ?? [], policies: body.policies ?? [], faqs: body.faqs ?? [] };
}

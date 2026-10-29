import { action, query, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/requireAdmin";
import {
  ENABLE_RAG_SHOPPING_ASSISTANT_KEY,
  RAG_GROUNDING_ENFORCEMENT_KEY,
  RAG_INDEX_VERSION,
  RAG_MAX_RETRIEVED_DOCUMENTS_KEY,
  RAG_RETRIEVAL_STRATEGY_KEY,
  deploymentGateEnabled,
  parseRagEnabled,
  parseRagGrounding,
  parseRagMaxDocuments,
  parseRagStrategy,
  resolveRagAvailability,
} from "./lib/rag/config";
import {
  appendSessionTurns,
  citationUrl,
  readSessionTurns,
  sessionAllowsAsk,
  nextAskCount,
} from "./lib/rag/content";
import { generateRagAnswer, embedRagTexts, ragProviderConfigured } from "./lib/rag/generate";
import { parseRagModelPayload, validateRagGrounding, RAG_SAFE_FALLBACK } from "./lib/rag/grounding";
import { defaultRagEnv, postRag, ragServiceConfigured } from "./lib/rag/pythonRagClient";

const EMPTY = {
  status: "disabled" as const,
  answer: "",
  citations: [] as RagCitation[],
  products: [] as RagProductRef[],
  intent: "",
};

type RagCitation = {
  sourceType: string;
  sourceId: string;
  productId: string | null;
  title: string;
  section: string;
  url: string;
};

type RagProductRef = { id: string; name: string; url: string };

type RetrievePayload = {
  documents?: Array<{
    chunk_id?: string;
    product_id?: string | null;
    title?: string;
    source_type?: string;
    source_id?: string;
    section?: string;
  }>;
  prompt?: { system?: string; user?: string } | null;
  intent?: string;
  empty?: boolean;
  index_version?: string;
  citations?: Array<{
    source_type?: string;
    source_id?: string;
    product_id?: string | null;
    title?: string;
    section?: string;
    url?: string;
    chunk_id?: string;
  }>;
};

export const publicStatus = query({
  args: {},
  handler: async (ctx) => {
    const enabledRow = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", ENABLE_RAG_SHOPPING_ASSISTANT_KEY))
      .unique();
    const state = await ctx.db
      .query("ragIndexState")
      .withIndex("by_version", (q) => q.eq("indexVersion", RAG_INDEX_VERSION))
      .unique();
    const availability = resolveRagAvailability({
      adminEnabled: parseRagEnabled(enabledRow?.value),
      deploymentGate: deploymentGateEnabled(process.env.RAG_SHOPPING_ASSISTANT_ENABLED),
      indexReady: (state?.chunkCount ?? 0) > 0,
      serviceConfigured: ragServiceConfigured(defaultRagEnv()),
      providerConfigured: ragProviderConfigured(),
    });
    return { enabled: availability.enabled };
  },
});

export const ask = action({
  args: {
    question: v.string(),
    sessionKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    status: "disabled" | "answered" | "empty" | "unavailable";
    answer: string;
    citations: RagCitation[];
    products: RagProductRef[];
    intent: string;
  }> => {
    const question = args.question.trim().slice(0, 500);
    if (!question) return { ...EMPTY, status: "empty" };
    const settings = await loadSettings(ctx);
    const state = await ctx.runQuery(internal.ragData.getIndexState, {});
    const availability = resolveRagAvailability({
      adminEnabled: parseRagEnabled(settings.enabled),
      deploymentGate: deploymentGateEnabled(process.env.RAG_SHOPPING_ASSISTANT_ENABLED),
      indexReady: (state?.chunkCount ?? 0) > 0,
      serviceConfigured: ragServiceConfigured(defaultRagEnv()),
      providerConfigured: ragProviderConfigured(),
    });
    if (!availability.enabled) return { ...EMPTY, status: "disabled" };

    let sessionKey: string;
    try { sessionKey = await ctx.runMutation(internal.aiUsage.reserveRag, { guest: args.sessionKey ?? "" }); }
    catch { return { ...EMPTY, status: "unavailable", answer: "Please refresh your session or try again later." }; }
    const now = Date.now();
    let turns: { role: "user" | "assistant"; text: string; productIds: string[] }[] = [];
    let askCount = 0;
    let windowStartedAt = now;
    if (sessionKey) {
      const session = await ctx.runQuery(internal.ragData.readSession, { sessionKey });
      if (session && !sessionAllowsAsk(session.askCount, session.windowStartedAt, now)) {
        return {
          ...EMPTY,
          status: "unavailable",
          answer: "Please wait a moment before asking another catalog question.",
        };
      }
      if (session) {
        turns = readSessionTurns(session.turnsJson, now, session.expiresAt);
        askCount = session.askCount;
        windowStartedAt = session.windowStartedAt;
      }
    }

    const strategy = parseRagStrategy(settings.strategy);
    const topK = parseRagMaxDocuments(settings.maxDocuments);
    const grounding = parseRagGrounding(settings.grounding);
    let semantic: unknown[] = [];
    if (strategy !== "keyword") {
      try {
        const embedded = await generateQueryEmbedding(question);
        const hits = await ctx.vectorSearch("ragChunks", "by_embedding", {
          vector: embedded,
          limit: 20,
          filter: (q) => q.eq("active", true),
        });
        const rows = await ctx.runQuery(internal.ragData.getChunksByIds, {
          ids: hits.map((hit) => hit._id),
        });
        const scores = new Map(hits.map((hit) => [hit._id, hit._score]));
        semantic = rows.map((row) => ({
          chunk_id: row.chunkId,
          document_id: row.documentId,
          source_type: row.sourceType,
          source_id: row.sourceId,
          product_id: row.productId ?? null,
          title: row.title,
          section: row.section,
          content: row.content,
          score: scores.get(row._id) ?? 0,
        }));
      } catch {
        semantic = [];
      }
    }
    const keyword =
      strategy === "semantic"
        ? []
        : await ctx.runQuery(internal.ragData.searchChunks, { query: question });
    const productIds = uniqueProductIds(semantic, keyword);
    const facts = await ctx.runQuery(internal.ragData.getFactsForProducts, { productIds });
    let retrieved: RetrievePayload;
    try {
      retrieved = await postRag<RetrievePayload>(
        "/api/v1/internal/rag/retrieve",
        {
          query: question,
          strategy,
          top_k: topK,
          conversation: turns.map((turn) => ({
            role: turn.role,
            text: turn.text,
            product_ids: turn.productIds,
          })),
          current_facts: facts,
          semantic_candidates: semantic,
          keyword_candidates: keyword,
          expected_index_version: RAG_INDEX_VERSION,
          grounding,
        },
        defaultRagEnv()
      );
    } catch {
      return { ...EMPTY, status: "unavailable", answer: RAG_SAFE_FALLBACK };
    }
    if (!retrieved.prompt?.system || !retrieved.prompt.user || retrieved.empty) {
      return {
        ...EMPTY,
        status: "empty",
        answer: "I could not find verified store information for that question.",
        intent: retrieved.intent ?? "",
      };
    }
    const generated = await generateRagAnswer(retrieved.prompt.system, retrieved.prompt.user);
    if (!generated) {
      return { ...EMPTY, status: "unavailable", answer: RAG_SAFE_FALLBACK };
    }
    const parsed = parseRagModelPayload(generated.text);
    const chunks = (retrieved.documents ?? [])
      .filter((item) => typeof item.chunk_id === "string")
      .map((item) => ({
        chunkId: item.chunk_id as string,
        productId: item.product_id,
      }));
    const checked = validateRagGrounding({
      answer: parsed.answer,
      citationIds: parsed.citationIds,
      chunks,
      facts: facts.map((fact) => ({
        productId: fact.product_id,
        name: fact.name,
        currency: fact.currency,
        price: fact.price,
        finalPrice: fact.final_price,
        stock: fact.stock,
        available: fact.available,
      })),
      mode: grounding,
    });
    const allowed = new Set(checked.citationIds);
    const citations = (retrieved.citations ?? [])
      .filter((item) => item.chunk_id && allowed.has(item.chunk_id))
      .map((item) => ({
        sourceType: item.source_type ?? "faq",
        sourceId: item.source_id ?? "",
        productId: item.product_id ?? null,
        title: item.title ?? "Store record",
        section: item.section ?? "",
        url: citationUrl(item.source_type ?? "", item.product_id),
      }));
    const products = citations
      .filter((item) => item.productId)
      .map((item) => ({
        id: item.productId as string,
        name: item.title,
        url: item.url,
      }));
    if (sessionKey) {
      const saved = appendSessionTurns(turns, question, checked.answer, products.map((item) => item.id));
      const counter = nextAskCount(askCount, windowStartedAt, now);
      await ctx.runMutation(internal.ragData.writeSession, {
        sessionKey,
        turnsJson: saved.turnsJson,
        expiresAt: saved.expiresAt,
        askCount: counter.askCount,
        windowStartedAt: counter.windowStartedAt,
      });
    }
    return {
      status: checked.grounded ? "answered" : "empty",
      answer: checked.answer,
      citations,
      products,
      intent: retrieved.intent ?? "",
    };
  },
});

export const syncCatalog = action({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    if (!ragServiceConfigured(defaultRagEnv())) {
      throw new Error("The catalog assistant service is not configured");
    }
    await ctx.runAction(internal.ragIndexing.reindexPolicies, {});
    await ctx.scheduler.runAfter(0, internal.ragIndexing.syncBatch, {
      cursor: null,
      remaining: 20,
    });
    return { scheduled: true };
  },
});

async function loadSettings(ctx: ActionCtx) {
  const enabled = await ctx.runQuery(internal.ragData.getSettingValue, {
    key: ENABLE_RAG_SHOPPING_ASSISTANT_KEY,
  });
  const strategy = await ctx.runQuery(internal.ragData.getSettingValue, {
    key: RAG_RETRIEVAL_STRATEGY_KEY,
  });
  const maxDocuments = await ctx.runQuery(internal.ragData.getSettingValue, {
    key: RAG_MAX_RETRIEVED_DOCUMENTS_KEY,
  });
  const grounding = await ctx.runQuery(internal.ragData.getSettingValue, {
    key: RAG_GROUNDING_ENFORCEMENT_KEY,
  });
  return { enabled, strategy, maxDocuments, grounding };
}

async function generateQueryEmbedding(question: string): Promise<number[]> {
  const embedded = await embedRagTexts([question]);
  const vector = embedded.vectors[0];
  if (!vector) throw new Error("Missing query embedding");
  return vector;
}

function uniqueProductIds(semantic: unknown[], keyword: unknown[]): string[] {
  const ids: string[] = [];
  for (const item of [...semantic, ...keyword]) {
    if (!item || typeof item !== "object") continue;
    const productId = (item as { product_id?: unknown }).product_id;
    if (typeof productId === "string" && !ids.includes(productId)) ids.push(productId);
  }
  return ids.slice(0, 20);
}

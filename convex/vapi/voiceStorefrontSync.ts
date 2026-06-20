import { query, type QueryCtx } from "../_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";

const ACTIVE_VOICE_SESSION_MS = 15 * 60 * 1000;

const cartLineValidator = v.object({
  productId: v.id("products"),
  color: v.string(),
  quantity: v.number(),
});

const completedToolValidator = v.object({
  logId: v.id("vapiConversationLogs"),
  toolName: v.string(),
  createdAt: v.number(),
  toolInput: v.union(v.string(), v.null()),
  toolOutput: v.union(v.string(), v.null()),
});

const storefrontSyncValidator = v.object({
  cartLines: v.array(cartLineValidator),
  cartUpdatedAt: v.union(v.number(), v.null()),
  lastProductId: v.union(v.string(), v.null()),
  lastCatalogSearch: v.union(v.string(), v.null()),
  lastCartActionAt: v.union(v.number(), v.null()),
  resolvedCallId: v.union(v.string(), v.null()),
  completedTools: v.array(completedToolValidator),
});

type StorefrontSync = {
  cartLines: Array<{
    productId: Id<"products">;
    color: string;
    quantity: number;
  }>;
  cartUpdatedAt: number | null;
  lastProductId: string | null;
  lastCatalogSearch: string | null;
  lastCartActionAt: number | null;
  resolvedCallId: string | null;
  completedTools: Array<{
    logId: Id<"vapiConversationLogs">;
    toolName: string;
    createdAt: number;
    toolInput: string | null;
    toolOutput: string | null;
  }>;
};

const emptySync = (): StorefrontSync => ({
  cartLines: [],
  cartUpdatedAt: null,
  lastProductId: null,
  lastCatalogSearch: null,
  lastCartActionAt: null,
  resolvedCallId: null,
  completedTools: [],
});

function parseToolOutputRecord(
  toolOutput: string | undefined
): Record<string, unknown> | null {
  if (!toolOutput?.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(toolOutput);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function parseToolInputRecord(
  toolInput: string | undefined
): Record<string, unknown> {
  if (!toolInput?.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(toolInput);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }
  return {};
}

function productIdFromPayload(payload: Record<string, unknown>): string | null {
  const id = payload.id ?? payload.productId;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

async function findSingleActiveVoiceConversation(
  ctx: QueryCtx
): Promise<Doc<"vapiConversations"> | null> {
  const cutoff = Date.now() - ACTIVE_VOICE_SESSION_MS;
  const recent = await ctx.db
    .query("vapiConversations")
    .withIndex("by_started_at")
    .order("desc")
    .take(12);

  const active = recent.filter(
    (conversation) =>
      conversation.channel === "voice" &&
      conversation.startedAt >= cutoff &&
      !conversation.endedAt
  );

  return active.length === 1 ? active[0]! : null;
}

async function resolveVoiceConversation(
  ctx: QueryCtx,
  vapiCallId: string | undefined,
  voiceSessionActive: boolean
): Promise<Doc<"vapiConversations"> | null> {
  const callId = vapiCallId?.trim();
  if (callId) {
    const exact = await ctx.db
      .query("vapiConversations")
      .withIndex("by_vapi_call_id", (q) => q.eq("vapiCallId", callId))
      .unique();
    if (exact) return exact;
  }

  if (voiceSessionActive) {
    return await findSingleActiveVoiceConversation(ctx);
  }

  return null;
}

async function buildStorefrontSyncFromConversation(
  ctx: QueryCtx,
  conversation: Doc<"vapiConversations">,
  sinceMs?: number
): Promise<StorefrontSync> {
  const voiceCart = await ctx.db
    .query("vapiVoiceCarts")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
    .unique();

  let lastProductId: string | null = null;
  let lastCatalogSearch: string | null = null;
  let lastCartActionAt: number | null = null;

  const logs = await ctx.db
    .query("vapiConversationLogs")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
    .order("desc")
    .take(50);

  const completedTools: StorefrontSync["completedTools"] = [];

  for (const log of logs) {
    const inSession = sinceMs === undefined || log.createdAt >= sinceMs;

    if (inSession && log.role === "tool" && log.toolName && log.toolOutput) {
      completedTools.push({
        logId: log._id,
        toolName: log.toolName,
        createdAt: log.createdAt,
        toolInput: log.toolInput ?? null,
        toolOutput: log.toolOutput ?? null,
      });
    }

    if (!inSession) continue;

    if (!lastProductId && log.toolOutput) {
      const payload = parseToolOutputRecord(log.toolOutput);
      if (payload && typeof payload.error !== "string") {
        if (
          log.toolName === "getProductDetails" ||
          log.toolName === "getProductReviews"
        ) {
          lastProductId = productIdFromPayload(payload);
        } else if (
          log.toolName === "addToCart" ||
          log.toolName === "addMultipleToCart"
        ) {
          lastProductId = productIdFromPayload(payload);
          if (payload.success === true && lastCartActionAt === null) {
            lastCartActionAt = log.createdAt;
          }
        }
      }
    }

    if (
      lastCartActionAt === null &&
      (log.toolName === "getCart" ||
        log.toolName === "addToCart" ||
        log.toolName === "addMultipleToCart") &&
      log.toolOutput
    ) {
      const payload = parseToolOutputRecord(log.toolOutput);
      if (payload && typeof payload.error !== "string") {
        lastCartActionAt = log.createdAt;
      }
    }

    if (!lastCatalogSearch && log.toolInput) {
      const input = parseToolInputRecord(log.toolInput);
      if (
        log.toolName === "searchProducts" ||
        log.toolName === "searchProductsHybrid" ||
        log.toolName === "recommendProducts"
      ) {
        const queryText =
          typeof input.query === "string"
            ? input.query.trim()
            : typeof input.preference === "string"
              ? input.preference.trim()
              : "";
        if (queryText) lastCatalogSearch = queryText;
      }
    }
  }

  const cartUpdatedAt =
    sinceMs !== undefined &&
    voiceCart?.updatedAt !== undefined &&
    voiceCart.updatedAt < sinceMs
      ? null
      : (voiceCart?.updatedAt ?? null);

  const cartLines =
    sinceMs !== undefined &&
    voiceCart?.updatedAt !== undefined &&
    voiceCart.updatedAt < sinceMs
      ? []
      : (voiceCart?.items ?? []);

  return {
    cartLines,
    cartUpdatedAt,
    lastProductId,
    lastCatalogSearch,
    lastCartActionAt,
    resolvedCallId: conversation.vapiCallId,
    completedTools,
  };
}

/** Reactive storefront state when the Vapi client misses tool-calls-result (server webhook tools). */
export const getStorefrontSyncByCallId = query({
  args: { vapiCallId: v.string() },
  returns: storefrontSyncValidator,
  handler: async (ctx, args) => {
    const conversation = await resolveVoiceConversation(ctx, args.vapiCallId, false);
    if (!conversation) return emptySync();
    return await buildStorefrontSyncFromConversation(ctx, conversation);
  },
});

/** Session-aware sync for live voice calls (handles call id lag / mismatch). */
export const getStorefrontSyncForSession = query({
  args: {
    vapiCallId: v.optional(v.string()),
    voiceSessionActive: v.boolean(),
    sinceMs: v.optional(v.number()),
  },
  returns: storefrontSyncValidator,
  handler: async (ctx, args) => {
    if (!args.voiceSessionActive && !args.vapiCallId?.trim()) {
      return emptySync();
    }

    const conversation = await resolveVoiceConversation(
      ctx,
      args.vapiCallId,
      args.voiceSessionActive
    );
    if (!conversation) return emptySync();
    return await buildStorefrontSyncFromConversation(
      ctx,
      conversation,
      args.sinceMs
    );
  },
});

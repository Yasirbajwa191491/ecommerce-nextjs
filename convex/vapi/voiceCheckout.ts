import { query } from "../_generated/server";
import { v } from "convex/values";

const pendingCheckoutValidator = v.union(
  v.object({
    checkoutUrl: v.string(),
    orderNumber: v.string(),
    total: v.number(),
    currency: v.string(),
  }),
  v.null()
);

const CHECKOUT_TTL_MS = 30 * 60 * 1000;

function checkoutFromConversation(
  conversation: {
    pendingCheckoutUrl?: string;
    pendingOrderNumber?: string;
    pendingCheckoutTotal?: number;
    pendingCheckoutCurrency?: string;
    pendingCheckoutAt?: number;
    startedAt: number;
  } | null
) {
  if (!conversation?.pendingCheckoutUrl || !conversation.pendingOrderNumber) {
    return null;
  }

  const createdAt = conversation.pendingCheckoutAt ?? conversation.startedAt;
  if (Date.now() - createdAt > CHECKOUT_TTL_MS) {
    return null;
  }

  return {
    checkoutUrl: conversation.pendingCheckoutUrl,
    orderNumber: conversation.pendingOrderNumber,
    total: conversation.pendingCheckoutTotal ?? 0,
    currency: conversation.pendingCheckoutCurrency ?? "USD",
  };
}

function parseCheckoutToolOutput(toolOutput: string | undefined) {
  if (!toolOutput?.trim()) return null;

  try {
    const parsed: unknown = JSON.parse(toolOutput);
    if (typeof parsed !== "object" || parsed === null) return null;

    const record = parsed as Record<string, unknown>;
    if (typeof record.error === "string") return null;

    const checkoutUrl =
      typeof record.checkoutUrl === "string"
        ? record.checkoutUrl
        : typeof record.url === "string"
          ? record.url
          : null;
    const orderNumber =
      typeof record.orderNumber === "string" ? record.orderNumber : null;

    if (!checkoutUrl || !orderNumber) return null;

    return {
      checkoutUrl,
      orderNumber,
      total: typeof record.total === "number" ? record.total : 0,
      currency: typeof record.currency === "string" ? record.currency : "USD",
    };
  } catch {
    return null;
  }
}

/** Fallback when the Vapi client misses tool-calls-result — reads stored checkout. */
export const getPendingCheckoutByCallId = query({
  args: { vapiCallId: v.string() },
  returns: pendingCheckoutValidator,
  handler: async (ctx, args) => {
    const callId = args.vapiCallId.trim();
    if (!callId) return null;

    const conversation = await ctx.db
      .query("vapiConversations")
      .withIndex("by_vapi_call_id", (q) => q.eq("vapiCallId", callId))
      .unique();

    const fromConversation = checkoutFromConversation(conversation);
    if (fromConversation) return fromConversation;

    if (!conversation) return null;

    const logs = await ctx.db
      .query("vapiConversationLogs")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversation._id)
      )
      .order("desc")
      .take(30);

    for (const log of logs) {
      if (log.toolName !== "createCheckoutSession") continue;
      const checkout = parseCheckoutToolOutput(log.toolOutput);
      if (checkout) return checkout;
    }

    return null;
  },
});

/** Latest voice checkout in this browser session (no call id required). */
export const getLatestPendingCheckout = query({
  args: {},
  returns: pendingCheckoutValidator,
  handler: async (ctx) => {
    const conversations = await ctx.db
      .query("vapiConversations")
      .withIndex("by_started_at")
      .order("desc")
      .take(12);

    for (const conversation of conversations) {
      const checkout = checkoutFromConversation(conversation);
      if (checkout) return checkout;
    }

    return null;
  },
});

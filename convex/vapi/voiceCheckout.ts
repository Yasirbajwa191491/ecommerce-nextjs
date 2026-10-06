import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";

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

/** Checkout for a call that this browser has bound. */
export const getPendingCheckoutByCallId = query({
  args: {
    vapiCallId: v.string(),
    browserSessionToken: v.string(),
  },
  returns: pendingCheckoutValidator,
  handler: async (ctx, args) => {
    const callId = args.vapiCallId.trim();
    const token = args.browserSessionToken.trim();
    if (!callId || !token) return null;

    const claim = await ctx.db
      .query("vapiBrowserClaims")
      .withIndex("by_call_id", (q) => q.eq("vapiCallId", callId))
      .unique();
    const conversation = await ctx.db
      .query("vapiConversations")
      .withIndex("by_vapi_call_id", (q) => q.eq("vapiCallId", callId))
      .unique();
    const bound = claim?.browserSessionToken ?? conversation?.browserSessionToken;
    if (bound !== token || !conversation) return null;

    const fromConversation = checkoutFromConversation(conversation);
    if (fromConversation) return fromConversation;

    const logs = await ctx.db
      .query("vapiConversationLogs")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
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

/** Latest checkout bound to this browser. Never scans other shoppers. */
export const getLatestPendingCheckout = query({
  args: { browserSessionToken: v.string() },
  returns: pendingCheckoutValidator,
  handler: async (ctx, args) => {
    const token = args.browserSessionToken.trim();
    if (!token) return null;
    const conversations = await ctx.db
      .query("vapiConversations")
      .withIndex("by_browser_session", (q) => q.eq("browserSessionToken", token))
      .order("desc")
      .take(5);

    for (const conversation of conversations) {
      const checkout = checkoutFromConversation(conversation);
      if (checkout) return checkout;
    }
    return null;
  },
});

export const bindVoiceBrowserSession = mutation({
  args: {
    vapiCallId: v.string(),
    browserSessionToken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const callId = args.vapiCallId.trim();
    const token = args.browserSessionToken.trim();
    if (!callId || token.length < 16) {
      throw new ConvexError("Invalid voice session");
    }

    const existing = await ctx.db
      .query("vapiBrowserClaims")
      .withIndex("by_call_id", (q) => q.eq("vapiCallId", callId))
      .unique();
    if (existing && existing.browserSessionToken !== token) {
      throw new ConvexError("Voice session is bound to another browser");
    }
    if (!existing) {
      await ctx.db.insert("vapiBrowserClaims", {
        vapiCallId: callId,
        browserSessionToken: token,
        createdAt: Date.now(),
      });
    }

    const conversation = await ctx.db
      .query("vapiConversations")
      .withIndex("by_vapi_call_id", (q) => q.eq("vapiCallId", callId))
      .unique();
    if (
      conversation?.browserSessionToken &&
      conversation.browserSessionToken !== token
    ) {
      throw new ConvexError("Voice session is bound to another browser");
    }
    if (conversation && !conversation.browserSessionToken) {
      await ctx.db.patch(conversation._id, { browserSessionToken: token });
    }
    return null;
  },
});

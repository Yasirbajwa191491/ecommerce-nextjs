import { internalMutation, internalQuery } from "../server";
import { ConvexError, v } from "convex/values";
import { incrementDailyAnalytics } from "./analyticsHelpers";
import { normalizeBrowserSessionToken } from "./browserSession";
import { adjustTableCount } from "../lib/maintainedAggregates";

export const incrementAnalytics = internalMutation({
  args: {
    field: v.union(
      v.literal("conversations"),
      v.literal("productSearches"),
      v.literal("orderTrackingRequests"),
      v.literal("leadsCaptured"),
      v.literal("humanEscalations"),
      v.literal("cartAdds"),
      v.literal("checkoutStarts")
    ),
    amount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await incrementDailyAnalytics(ctx, args.field, args.amount ?? 1);
    return null;
  },
});

export const upsertConversation = internalMutation({
  args: {
    vapiCallId: v.string(),
    channel: v.union(v.literal("voice"), v.literal("chat")),
    browserSessionToken: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    summary: v.optional(v.string()),
    ended: v.optional(v.boolean()),
  },
  returns: v.object({
    conversationId: v.id("vapiConversations"),
    isNew: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("vapiConversations")
      .withIndex("by_vapi_call_id", (q) => q.eq("vapiCallId", args.vapiCallId))
      .unique();

    const now = Date.now();
    const requestedToken = normalizeBrowserSessionToken(args.browserSessionToken);

    if (existing) {
      if (
        requestedToken &&
        existing.browserSessionVerifiedAt !== undefined &&
        normalizeBrowserSessionToken(existing.browserSessionToken) !== requestedToken
      ) {
        throw new ConvexError("Voice session metadata does not match its verified owner");
      }
      await ctx.db.patch(existing._id, {
        customerEmail: args.customerEmail ?? existing.customerEmail,
        customerPhone: args.customerPhone ?? existing.customerPhone,
        summary: args.summary ?? existing.summary,
        endedAt: args.ended ? now : existing.endedAt,
        ...(requestedToken && existing.browserSessionVerifiedAt === undefined
          ? { browserSessionToken: requestedToken, browserSessionVerifiedAt: now }
          : {}),
      });
      return { conversationId: existing._id, isNew: false };
    }

    const conversationId = await ctx.db.insert("vapiConversations", {
      vapiCallId: args.vapiCallId,
      channel: args.channel,
      startedAt: now,
      browserSessionToken: requestedToken,
      browserSessionVerifiedAt: requestedToken ? now : undefined,
      messageCount: 0,
      userMessages: 0,
      assistantMessages: 0,
      toolCalls: 0,
      customerEmail: args.customerEmail,
      customerPhone: args.customerPhone,
      summary: args.summary,
    });

    await incrementDailyAnalytics(ctx, "conversations");
    await adjustTableCount(ctx, "vapiConversations", { all: 1 });
    return { conversationId, isNew: true };
  },
});

export const appendLog = internalMutation({
  args: {
    conversationId: v.id("vapiConversations"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("tool"),
      v.literal("system")
    ),
    content: v.string(),
    toolName: v.optional(v.string()),
    toolInput: v.optional(v.string()),
    toolOutput: v.optional(v.string()),
    dedupe: v.optional(v.boolean()),
  },
  returns: v.union(v.id("vapiConversationLogs"), v.null()),
  handler: async (ctx, args) => {
    const content = args.content.trim();
    if (!content) return null;

    if (args.dedupe) {
      const recent = await ctx.db
        .query("vapiConversationLogs")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", args.conversationId)
        )
        .order("desc")
        .take(8);

      const duplicate = recent.some(
        (log) => log.role === args.role && log.content === content
      );
      if (duplicate) return null;
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new ConvexError("Voice conversation not found");
    const logId = await ctx.db.insert("vapiConversationLogs", {
      conversationId: args.conversationId,
      role: args.role,
      content,
      toolName: args.toolName,
      toolInput: args.toolInput,
      toolOutput: args.toolOutput,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.conversationId, {
      messageCount: (conversation.messageCount ?? 0) + 1,
      userMessages: (conversation.userMessages ?? 0) + (args.role === "user" ? 1 : 0),
      assistantMessages: (conversation.assistantMessages ?? 0) + (args.role === "assistant" ? 1 : 0),
      toolCalls: (conversation.toolCalls ?? 0) + (args.role === "tool" ? 1 : 0),
    });
    return logId;
  },
});

export const setPendingVoiceCheckout = internalMutation({
  args: {
    conversationId: v.id("vapiConversations"),
    checkoutUrl: v.string(),
    orderNumber: v.string(),
    total: v.number(),
    currency: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      pendingCheckoutUrl: args.checkoutUrl,
      pendingOrderNumber: args.orderNumber,
      pendingCheckoutTotal: args.total,
      pendingCheckoutCurrency: args.currency,
      pendingCheckoutAt: Date.now(),
    });
    return null;
  },
});

export const getConversationByCallId = internalQuery({
  args: { vapiCallId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("vapiConversations"),
      vapiCallId: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("vapiConversations")
      .withIndex("by_vapi_call_id", (q) => q.eq("vapiCallId", args.vapiCallId))
      .unique();
    if (!row) return null;
    return { _id: row._id, vapiCallId: row.vapiCallId };
  },
});

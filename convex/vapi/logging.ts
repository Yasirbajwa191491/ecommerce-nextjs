import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { incrementDailyAnalytics } from "./analyticsHelpers";

export const incrementAnalytics = internalMutation({
  args: {
    field: v.union(
      v.literal("conversations"),
      v.literal("productSearches"),
      v.literal("orderTrackingRequests"),
      v.literal("leadsCaptured"),
      v.literal("humanEscalations")
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

    if (existing) {
      await ctx.db.patch(existing._id, {
        customerEmail: args.customerEmail ?? existing.customerEmail,
        customerPhone: args.customerPhone ?? existing.customerPhone,
        summary: args.summary ?? existing.summary,
        endedAt: args.ended ? now : existing.endedAt,
      });
      return { conversationId: existing._id, isNew: false };
    }

    const conversationId = await ctx.db.insert("vapiConversations", {
      vapiCallId: args.vapiCallId,
      channel: args.channel,
      startedAt: now,
      customerEmail: args.customerEmail,
      customerPhone: args.customerPhone,
      summary: args.summary,
    });

    await incrementDailyAnalytics(ctx, "conversations");
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

    return await ctx.db.insert("vapiConversationLogs", {
      conversationId: args.conversationId,
      role: args.role,
      content,
      toolName: args.toolName,
      toolInput: args.toolInput,
      toolOutput: args.toolOutput,
      createdAt: Date.now(),
    });
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

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/requireAdmin";
import { copilotResponseValidator } from "./lib/ai/copilotTypes";

export const listConversations = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("aiCopilotConversations"),
      title: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    const conversations = await ctx.db
      .query("aiCopilotConversations")
      .withIndex("by_admin_updated", (q) => q.eq("adminUserId", admin._id))
      .order("desc")
      .take(30);

    return conversations.map((c) => ({
      _id: c._id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  },
});

export const getConversationMessages = query({
  args: { conversationId: v.id("aiCopilotConversations") },
  returns: v.array(
    v.object({
      _id: v.id("aiCopilotMessages"),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      response: v.optional(copilotResponseValidator),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.adminUserId !== admin._id) {
      throw new Error("Conversation not found");
    }

    const messages = await ctx.db
      .query("aiCopilotMessages")
      .withIndex("by_conversation_created", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    return messages.map((m) => ({
      _id: m._id,
      role: m.role,
      content: m.content,
      response: m.response,
      createdAt: m.createdAt,
    }));
  },
});

export const listSavedInsights = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("aiCopilotSavedInsights"),
      question: v.string(),
      response: copilotResponseValidator,
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    const insights = await ctx.db
      .query("aiCopilotSavedInsights")
      .withIndex("by_admin_created", (q) => q.eq("adminUserId", admin._id))
      .order("desc")
      .take(50);

    return insights.map((i) => ({
      _id: i._id,
      question: i.question,
      response: i.response,
      createdAt: i.createdAt,
    }));
  },
});

export const createConversation = mutation({
  args: { title: v.optional(v.string()) },
  returns: v.id("aiCopilotConversations"),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();
    return await ctx.db.insert("aiCopilotConversations", {
      adminUserId: admin._id,
      title: args.title?.trim() || "New conversation",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const saveInsight = mutation({
  args: {
    question: v.string(),
    response: copilotResponseValidator,
    conversationId: v.optional(v.id("aiCopilotConversations")),
    messageId: v.optional(v.id("aiCopilotMessages")),
  },
  returns: v.id("aiCopilotSavedInsights"),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    return await ctx.db.insert("aiCopilotSavedInsights", {
      adminUserId: admin._id,
      question: args.question.trim(),
      response: args.response,
      conversationId: args.conversationId,
      messageId: args.messageId,
      createdAt: Date.now(),
    });
  },
});

export const deleteSavedInsight = mutation({
  args: { insightId: v.id("aiCopilotSavedInsights") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const insight = await ctx.db.get(args.insightId);
    if (!insight || insight.adminUserId !== admin._id) {
      throw new Error("Insight not found");
    }
    await ctx.db.delete(args.insightId);
    return null;
  },
});

export const deleteConversation = mutation({
  args: { conversationId: v.id("aiCopilotConversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.adminUserId !== admin._id) {
      throw new Error("Conversation not found");
    }

    const messages = await ctx.db
      .query("aiCopilotMessages")
      .withIndex("by_conversation_created", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    await ctx.db.delete(args.conversationId);
    return null;
  },
});

export const appendMessages = mutation({
  args: {
    conversationId: v.id("aiCopilotConversations"),
    question: v.string(),
    response: copilotResponseValidator,
  },
  returns: v.object({
    userMessageId: v.id("aiCopilotMessages"),
    assistantMessageId: v.id("aiCopilotMessages"),
  }),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.adminUserId !== admin._id) {
      throw new Error("Conversation not found");
    }

    const now = Date.now();
    const userMessageId = await ctx.db.insert("aiCopilotMessages", {
      conversationId: args.conversationId,
      role: "user",
      content: args.question.trim(),
      createdAt: now,
    });

    const assistantMessageId = await ctx.db.insert("aiCopilotMessages", {
      conversationId: args.conversationId,
      role: "assistant",
      content: args.response.summary,
      response: args.response,
      createdAt: now + 1,
    });

    const title =
      conversation.title === "New conversation"
        ? args.question.trim().slice(0, 60)
        : conversation.title;

    await ctx.db.patch(args.conversationId, {
      title,
      updatedAt: now,
    });

    return { userMessageId, assistantMessageId };
  },
});

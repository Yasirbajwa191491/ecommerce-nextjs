import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/requireAdmin";
import { copilotResponseValidator } from "./lib/ai/copilotTypes";

export const getAdminSession = internalQuery({
  args: {},
  returns: v.object({ adminUserId: v.string() }),
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    return { adminUserId: admin._id };
  },
});

export const createConversationInternal = internalMutation({
  args: {
    adminUserId: v.string(),
    title: v.string(),
  },
  returns: v.id("aiCopilotConversations"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("aiCopilotConversations", {
      adminUserId: args.adminUserId,
      title: args.title.trim() || "New conversation",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const appendMessagesInternal = internalMutation({
  args: {
    conversationId: v.id("aiCopilotConversations"),
    adminUserId: v.string(),
    question: v.string(),
    response: copilotResponseValidator,
  },
  returns: v.object({
    userMessageId: v.id("aiCopilotMessages"),
    assistantMessageId: v.id("aiCopilotMessages"),
  }),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.adminUserId !== args.adminUserId) {
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

    await ctx.db.patch(args.conversationId, {
      title:
        conversation.title === "New conversation"
          ? args.question.trim().slice(0, 60)
          : conversation.title,
      updatedAt: now,
    });

    return { userMessageId, assistantMessageId };
  },
});

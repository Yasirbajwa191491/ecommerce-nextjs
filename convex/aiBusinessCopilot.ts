"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { routeCopilotQuestion } from "./lib/ai/copilotRouter";
import { generateCopilotInsight } from "./lib/ai/copilotGeneration";
import {
  copilotResponseValidator,
  MAX_COPILOT_QUESTION_LENGTH,
  type CopilotResponse,
} from "./lib/ai/copilotTypes";

type AskCopilotResult = {
  response: CopilotResponse;
  conversationId: Id<"aiCopilotConversations">;
  messageId: Id<"aiCopilotMessages">;
  intents: string[];
};

function requireGeminiKey(): void {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Set it in your Convex environment."
    );
  }
}

function validateQuestion(question: string): string {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("Please enter a question.");
  }
  if (trimmed.length > MAX_COPILOT_QUESTION_LENGTH) {
    throw new Error(
      `Question is too long. Maximum ${MAX_COPILOT_QUESTION_LENGTH} characters.`
    );
  }
  return trimmed;
}

export const askCopilot = action({
  args: {
    question: v.string(),
    conversationId: v.optional(v.id("aiCopilotConversations")),
  },
  returns: v.object({
    response: copilotResponseValidator,
    conversationId: v.id("aiCopilotConversations"),
    messageId: v.id("aiCopilotMessages"),
    intents: v.array(v.string()),
  }),
  handler: async (ctx, args): Promise<AskCopilotResult> => {
    const admin = await ctx.runQuery(internal.lib.adminAuth.requireAdminQuery, {});
    void admin;

    const session: { adminUserId: string } = await ctx.runQuery(
      internal.aiBusinessCopilotQueries.getAdminSession,
      {}
    );
    const rateLimit = await ctx.runMutation(
      internal.aiCopilotRateLimit.checkCopilotRateLimit,
      { adminUserId: session.adminUserId }
    );

    if (!rateLimit.allowed) {
      const retryMinutes = Math.ceil(rateLimit.retryAfterMs / 60000);
      throw new Error(
        `AI request limit reached. Please try again in ${retryMinutes} minute(s).`
      );
    }

    requireGeminiKey();
    const question = validateQuestion(args.question);
    const referenceNow = Date.now();
    const intents = routeCopilotQuestion(question);

    const businessData = await ctx.runQuery(
      internal.aiBusinessIntelligence.getBusinessContext,
      { intents, referenceNow }
    );

    await ctx.runMutation(internal.aiCopilotRateLimit.setAnalyticsCache, {
      cacheKey: `context:${intents.sort().join(",")}`,
      payload: JSON.stringify(businessData),
      referenceNow,
    });

    const response = await generateCopilotInsight({
      question,
      intents,
      businessData,
    });

    const conversationId =
      args.conversationId ??
      (await ctx.runMutation(
        internal.aiBusinessCopilotQueries.createConversationInternal,
        { adminUserId: session.adminUserId, title: question.slice(0, 60) }
      ));

    const { assistantMessageId } = await ctx.runMutation(
      internal.aiBusinessCopilotQueries.appendMessagesInternal,
      {
        conversationId,
        adminUserId: session.adminUserId,
        question,
        response,
      }
    );

    return {
      response,
      conversationId,
      messageId: assistantMessageId,
      intents: intents.map(String),
    };
  },
});

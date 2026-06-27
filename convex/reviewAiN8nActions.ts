"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getReviewAIProvider } from "./lib/ai/getProvider";
import { embedReviewText } from "./lib/ai/reviewIntelligence";
import { buildReviewText } from "./lib/ai/tagUtils";

export const saveGenerationWithEmbed = internalAction({
  args: {
    reviewId: v.id("productReviews"),
    productId: v.optional(v.id("products")),
    type: v.union(
      v.literal("sentiment"),
      v.literal("tags"),
      v.literal("moderation"),
      v.literal("reply"),
      v.literal("summary"),
      v.literal("topics"),
      v.literal("full_analysis")
    ),
    content: v.string(),
    provider: v.string(),
    model: v.string(),
    source: v.union(
      v.literal("automatic"),
      v.literal("manual"),
      v.literal("fallback")
    ),
    triggeredBy: v.optional(v.string()),
    jobId: v.optional(v.id("reviewAiJobs")),
    durationMs: v.optional(v.number()),
    mode: v.optional(
      v.union(
        v.literal("replace"),
        v.literal("version"),
        v.literal("history_only")
      )
    ),
    applyToReview: v.optional(v.boolean()),
    title: v.optional(v.string()),
    reviewContent: v.optional(v.string()),
  },
  returns: v.id("reviewAiGenerations"),
  handler: async (ctx, args): Promise<Id<"reviewAiGenerations">> => {
    let content = args.content;

    if (args.type === "full_analysis") {
      try {
        const parsed = JSON.parse(content) as Record<string, unknown>;
        if (!parsed.embedding) {
          const provider = getReviewAIProvider();
          const text = buildReviewText(
            args.title ?? "",
            args.reviewContent ?? String(parsed.content ?? "")
          );
          const embedding = await embedReviewText(provider, text);
          parsed.embedding = embedding;
          content = JSON.stringify(parsed);
        }
      } catch {
        // keep original content
      }
    }

    const generationId = await ctx.runMutation(
      internal.reviewAiGenerations.saveGenerationFromN8n,
      {
        reviewId: args.reviewId,
        productId: args.productId,
        type: args.type,
        content,
        provider: args.provider,
        model: args.model,
        source: args.source,
        triggeredBy: args.triggeredBy,
        jobId: args.jobId,
        durationMs: args.durationMs,
        mode: args.mode,
        applyToReview: args.applyToReview,
      }
    );

    if (args.jobId) {
      await ctx.runMutation(internal.reviewAiQueueMutations.markJobCompleted, {
        jobId: args.jobId,
      });
      await ctx.runMutation(internal.reviewAiQueueMutations.markJobProviderSuccess, {
        jobId: args.jobId,
        provider: args.provider,
      });
    }

    await ctx.runMutation(internal.reviewAiMetrics.recordMetric, {
      provider: args.provider,
      type: args.type,
      success: true,
      isFallback: args.source === "fallback",
      durationMs: args.durationMs,
    });

    return generationId;
  },
});

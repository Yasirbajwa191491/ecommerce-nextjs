import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { recordGeneration } from "./lib/ai/generationHistory";

export const backfillFromReviews = internalMutation({
  args: { limit: v.optional(v.number()) },
  returns: v.object({ backfilled: v.number() }),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 200, 500);
    const reviews = await ctx.db.query("productReviews").take(limit);
    let backfilled = 0;

    for (const review of reviews) {
      if (!review.aiSentiment && !review.aiTags?.length) continue;

      const existing = await ctx.db
        .query("reviewAiGenerations")
        .withIndex("by_review_type_version", (q) =>
          q.eq("reviewId", review._id).eq("type", "full_analysis")
        )
        .take(1);

      if (existing.length > 0) continue;

      const content = JSON.stringify({
        sentiment: review.aiSentiment,
        sentimentConfidence: review.aiSentimentConfidence,
        tags: review.aiTags ?? [],
        moderation: review.aiModeration ?? { flagged: false },
      });

      await recordGeneration(ctx, {
        reviewId: review._id,
        productId: review.productId,
        type: "full_analysis",
        content,
        provider: "unknown",
        model: "legacy",
        source: "automatic",
        triggeredBy: "backfill",
        mode: "version",
      });

      backfilled += 1;
    }

    return { backfilled };
  },
});

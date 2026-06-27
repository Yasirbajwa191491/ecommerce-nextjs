"use node";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

/** @deprecated Use reviewAiQueueActions via enqueueReviewAiJob. Kept for scheduler compatibility. */
export const processReview = internalAction({
  args: { reviewId: v.id("productReviews") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.reviewAiQueueMutations.enqueueJob, {
      jobType: "analyze_review",
      reviewId: args.reviewId,
      priority: 5,
      idempotencyKey: `analyze_review:${args.reviewId}:legacy:${Date.now()}`,
    });
    return null;
  },
});

/** @deprecated Use reviewAiQueueActions via enqueueReviewAiJob. */
export const regenerateProductInsights = internalAction({
  args: {
    productId: v.id("products"),
    force: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.reviewAiQueueMutations.enqueueJob, {
      jobType: "regenerate_insights",
      productId: args.productId,
      idempotencyKey: `regenerate_insights:${args.productId}:${args.force ? "force" : "auto"}:${Date.now()}`,
      payload: JSON.stringify({ force: args.force ?? false }),
    });
    return null;
  },
});

/** @deprecated Use reviewAiQueueActions via enqueueReviewAiJob. */
export const generateReply = internalAction({
  args: { reviewId: v.id("productReviews") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.reviewAiQueueMutations.enqueueJob, {
      jobType: "generate_reply",
      reviewId: args.reviewId,
      priority: 1,
      idempotencyKey: `generate_reply:${args.reviewId}:${Date.now()}`,
    });
    return null;
  },
});

import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

const weekMs = 7 * 24 * 60 * 60 * 1000;

export const getWeeklyStats = internalQuery({
  args: {},
  returns: v.object({
    periodStart: v.number(),
    periodEnd: v.number(),
    newReviews: v.number(),
    approvedReviews: v.number(),
    pendingReviews: v.number(),
    averageRating: v.number(),
    sentimentBreakdown: v.object({
      positive: v.number(),
      neutral: v.number(),
      negative: v.number(),
      unanalyzed: v.number(),
    }),
    flaggedCount: v.number(),
    aiQueue: v.object({
      pending: v.number(),
      retryScheduled: v.number(),
      failed: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const periodStart = now - weekMs;

    const allReviews = await ctx.db.query("productReviews").take(5000);
    const weekReviews = allReviews.filter((r) => r.createdAt >= periodStart);

    const approved = weekReviews.filter((r) => r.isApproved);
    const pending = weekReviews.filter((r) => !r.isApproved);
    const ratings = approved.map((r) => r.rating);
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

    const sentimentBreakdown = {
      positive: 0,
      neutral: 0,
      negative: 0,
      unanalyzed: 0,
    };
    for (const review of weekReviews) {
      if (review.aiSentiment === "positive") sentimentBreakdown.positive += 1;
      else if (review.aiSentiment === "neutral") sentimentBreakdown.neutral += 1;
      else if (review.aiSentiment === "negative") sentimentBreakdown.negative += 1;
      else sentimentBreakdown.unanalyzed += 1;
    }

    const flaggedCount = weekReviews.filter(
      (r) => r.aiModeration?.flagged === true
    ).length;

    const [queuePending, queueRetry, queueFailed] = await Promise.all([
      ctx.db
        .query("reviewAiJobs")
        .withIndex("by_status_priority", (q) => q.eq("status", "pending"))
        .take(500),
      ctx.db
        .query("reviewAiJobs")
        .withIndex("by_status_next_retry", (q) =>
          q.eq("status", "retry_scheduled")
        )
        .take(500),
      ctx.db
        .query("reviewAiJobs")
        .withIndex("by_status_priority", (q) => q.eq("status", "failed"))
        .take(500),
    ]);

    return {
      periodStart,
      periodEnd: now,
      newReviews: weekReviews.length,
      approvedReviews: approved.length,
      pendingReviews: pending.length,
      averageRating: Math.round(averageRating * 10) / 10,
      sentimentBreakdown,
      flaggedCount,
      aiQueue: {
        pending: queuePending.length,
        retryScheduled: queueRetry.length,
        failed: queueFailed.length,
      },
    };
  },
});

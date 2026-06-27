import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./lib/requireAdmin";
import { computeReviewAiQueueStats } from "./lib/reviewAiQueueStats";
import {
  buildAnalyzeReviewIdempotencyKey,
  enqueueReviewAiJob,
  REVIEW_AI_PRIORITY,
} from "./lib/reviewAiQueue";
import { reviewAiJobStatusValidator, reviewAiJobTypeValidator } from "./lib/aiValidators";

export const getQueueStats = query({
  args: {},
  returns: v.object({
    pending: v.number(),
    processing: v.number(),
    retryScheduled: v.number(),
    failed: v.number(),
    completedLast24h: v.number(),
    oldestPendingAgeMs: v.optional(v.number()),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await computeReviewAiQueueStats(ctx);
  },
});

export const listRecentJobs = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("reviewAiJobs"),
      jobType: reviewAiJobTypeValidator,
      reviewId: v.optional(v.id("productReviews")),
      productId: v.optional(v.id("products")),
      status: reviewAiJobStatusValidator,
      retryCount: v.number(),
      lastError: v.optional(v.string()),
      nextRetryAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 20, 50);

    const statuses = [
      "pending",
      "processing",
      "retry_scheduled",
      "failed",
    ] as const;

    const jobs = [];
    for (const status of statuses) {
      const batch =
        status === "retry_scheduled"
          ? await ctx.db
              .query("reviewAiJobs")
              .withIndex("by_status_next_retry", (q) =>
                q.eq("status", status)
              )
              .take(limit)
          : await ctx.db
              .query("reviewAiJobs")
              .withIndex("by_status_priority", (q) => q.eq("status", status))
              .take(limit);
      jobs.push(...batch);
    }

    return jobs
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit)
      .map((job) => ({
        _id: job._id,
        jobType: job.jobType,
        reviewId: job.reviewId,
        productId: job.productId,
        status: job.status,
        retryCount: job.retryCount,
        lastError: job.lastError,
        nextRetryAt: job.nextRetryAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      }));
  },
});

export const bulkReprocessReviews = mutation({
  args: {
    reviewIds: v.array(v.id("productReviews")),
  },
  returns: v.object({ enqueued: v.number(), jobIds: v.array(v.id("reviewAiJobs")) }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.reviewIds.length === 0) {
      throw new ConvexError("Select at least one review");
    }
    if (args.reviewIds.length > 100) {
      throw new ConvexError("Maximum 100 reviews per bulk reprocess");
    }

    const jobIds = [];
    for (const reviewId of args.reviewIds) {
      const review = await ctx.db.get(reviewId);
      if (!review) continue;

      await ctx.db.patch(reviewId, {
        aiAnalysisStatus: "pending",
        aiError: undefined,
        updatedAt: Date.now(),
      });

      const jobId = await enqueueReviewAiJob(ctx, {
        jobType: "bulk_reprocess",
        reviewId,
        priority: REVIEW_AI_PRIORITY.bulk,
        idempotencyKey: buildAnalyzeReviewIdempotencyKey(
          reviewId,
          review.title,
          review.content
        ),
      });
      jobIds.push(jobId);
    }

    await ctx.scheduler.runAfter(0, internal.n8nWebhooks.emitReviewEvent, {
      event: "review.bulk_process",
      payload: JSON.stringify({
        jobIds,
        reviewIds: args.reviewIds,
        count: jobIds.length,
      }),
    });

    return { enqueued: jobIds.length, jobIds };
  },
});

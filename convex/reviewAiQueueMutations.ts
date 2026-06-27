import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  reviewAiJobErrorCodeValidator,
  reviewAiJobStatusValidator,
  reviewAiJobTypeValidator,
} from "./lib/aiValidators";
import {
  MAX_REVIEW_AI_RETRIES,
  REVIEW_AI_PRIORITY,
  computeRetryDelayMs,
  findExistingActiveJob,
} from "./lib/reviewAiQueue";
import type { ReviewAiJobErrorCode } from "./lib/reviewAiQueueTypes";
import { computeReviewAiQueueStats } from "./lib/reviewAiQueueStats";
import {
  getPrimaryProviderName,
  isN8nFallbackEnabled,
} from "./lib/ai/featureFlags";
import { getReviewReplyStoreContext } from "./lib/settingsHelpers";

const enqueueArgsValidator = {
  jobType: reviewAiJobTypeValidator,
  reviewId: v.optional(v.id("productReviews")),
  productId: v.optional(v.id("products")),
  priority: v.optional(v.number()),
  idempotencyKey: v.string(),
  payload: v.optional(v.string()),
  maxRetries: v.optional(v.number()),
};

export const enqueueJob = internalMutation({
  args: enqueueArgsValidator,
  returns: v.id("reviewAiJobs"),
  handler: async (ctx, args) => {
    const existing = await findExistingActiveJob(ctx, args.idempotencyKey);
    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    const jobId = await ctx.db.insert("reviewAiJobs", {
      jobType: args.jobType,
      reviewId: args.reviewId,
      productId: args.productId,
      status: "pending",
      priority: args.priority ?? REVIEW_AI_PRIORITY.normal,
      retryCount: 0,
      maxRetries: args.maxRetries ?? MAX_REVIEW_AI_RETRIES,
      idempotencyKey: args.idempotencyKey,
      payload: args.payload,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.reviewAiQueueActions.processNextJob, {});

    return jobId;
  },
});

export const claimNextJob = internalMutation({
  args: {},
  returns: v.union(v.id("reviewAiJobs"), v.null()),
  handler: async (ctx) => {
    const now = Date.now();

    const dueRetries = await ctx.db
      .query("reviewAiJobs")
      .withIndex("by_status_next_retry", (q) =>
        q.eq("status", "retry_scheduled")
      )
      .take(50);

    const dueRetry = dueRetries
      .filter(
        (job) =>
          job.nextRetryAt != null &&
          job.nextRetryAt <= now &&
          !job.fallbackTriggered
      )
      .sort((a, b) => (a.nextRetryAt ?? 0) - (b.nextRetryAt ?? 0))[0];

    if (dueRetry) {
      await ctx.db.patch(dueRetry._id, {
        status: "processing",
        updatedAt: now,
      });
      return dueRetry._id;
    }

    const pendingJobs = await ctx.db
      .query("reviewAiJobs")
      .withIndex("by_status_priority", (q) => q.eq("status", "pending"))
      .take(50);

    const nextPending = pendingJobs.sort(
      (a, b) => a.priority - b.priority || a.createdAt - b.createdAt
    )[0];

    if (!nextPending) return null;

    await ctx.db.patch(nextPending._id, {
      status: "processing",
      updatedAt: now,
    });

    return nextPending._id;
  },
});

export const claimJobById = internalMutation({
  args: { jobId: v.id("reviewAiJobs") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return false;

    const now = Date.now();
    if (job.status === "pending") {
      await ctx.db.patch(args.jobId, { status: "processing", updatedAt: now });
      return true;
    }

    if (
      job.status === "retry_scheduled" &&
      job.nextRetryAt != null &&
      job.nextRetryAt <= now &&
      !job.fallbackTriggered
    ) {
      await ctx.db.patch(args.jobId, { status: "processing", updatedAt: now });
      return true;
    }

    return false;
  },
});

export const setJobProvider = internalMutation({
  args: {
    jobId: v.id("reviewAiJobs"),
    provider: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      lastAttemptedProvider: args.provider,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const markJobProviderSuccess = internalMutation({
  args: {
    jobId: v.id("reviewAiJobs"),
    provider: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      successfulProvider: args.provider,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const markJobCompleted = internalMutation({
  args: { jobId: v.id("reviewAiJobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
      lastError: undefined,
      lastErrorCode: undefined,
    });
    return null;
  },
});

export const markJobFailed = internalMutation({
  args: {
    jobId: v.id("reviewAiJobs"),
    error: v.string(),
    errorCode: reviewAiJobErrorCodeValidator,
    retryAfterMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;

    const now = Date.now();
    const nextRetryCount = job.retryCount + 1;
    const canRetry =
      args.errorCode !== "permanent" && nextRetryCount <= job.maxRetries;

    if (canRetry) {
      const useN8nFallback =
        isN8nFallbackEnabled() &&
        args.errorCode !== "permanent" &&
        getPrimaryProviderName() === "gemini";

      const delayMs = computeRetryDelayMs(
        job.retryCount,
        args.errorCode as ReviewAiJobErrorCode,
        args.retryAfterMs
      );

      if (useN8nFallback) {
        await ctx.db.patch(args.jobId, {
          status: "retry_scheduled",
          retryCount: nextRetryCount,
          nextRetryAt: now + delayMs,
          lastError: args.error,
          lastErrorCode: args.errorCode,
          fallbackTriggered: true,
          lastAttemptedProvider: getPrimaryProviderName(),
          updatedAt: now,
        });

        const storeContext = await getReviewReplyStoreContext(ctx);
        let reviewText:
          | {
              title: string;
              content: string;
              rating: number;
              customerName: string;
            }
          | undefined;
        if (job.reviewId) {
          const review = await ctx.db.get(job.reviewId);
          if (review) {
            reviewText = {
              title: review.title,
              content: review.content,
              rating: review.rating,
              customerName: review.customerName,
            };
          }
        }

        await ctx.scheduler.runAfter(
          0,
          internal.n8nWebhooks.emitReviewEvent,
          {
            event: "review.ai.fallback_requested",
            payload: JSON.stringify({
              jobId: args.jobId,
              jobType: job.jobType,
              reviewId: job.reviewId,
              productId: job.productId,
              errorCode: args.errorCode,
              error: args.error,
              retryCount: nextRetryCount,
              types: ["sentiment", "tags", "moderation", "full_analysis"],
              source: "fallback",
              regenerationMode: "version",
              storeContext,
              reviewText,
            }),
          }
        );

        return null;
      }

      await ctx.db.patch(args.jobId, {
        status: "retry_scheduled",
        retryCount: nextRetryCount,
        nextRetryAt: now + delayMs,
        lastError: args.error,
        lastErrorCode: args.errorCode,
        updatedAt: now,
      });

      await ctx.scheduler.runAfter(
        delayMs,
        internal.reviewAiQueueActions.processJobById,
        { jobId: args.jobId }
      );

      await ctx.scheduler.runAfter(
        0,
        internal.n8nWebhooks.emitReviewEvent,
        {
          event: "review.ai.retry_scheduled",
          payload: JSON.stringify({
            jobId: args.jobId,
            jobType: job.jobType,
            reviewId: job.reviewId,
            productId: job.productId,
            nextRetryAt: now + delayMs,
            retryCount: nextRetryCount,
            errorCode: args.errorCode,
          }),
        }
      );

      return null;
    }

    await ctx.db.patch(args.jobId, {
      status: "failed",
      retryCount: nextRetryCount,
      lastError: args.error,
      lastErrorCode: args.errorCode,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.n8nWebhooks.emitReviewEvent, {
      event: "review.ai.failed",
      payload: JSON.stringify({
        jobId: args.jobId,
        jobType: job.jobType,
        reviewId: job.reviewId,
        productId: job.productId,
        error: args.error,
        errorCode: args.errorCode,
      }),
    });

    return null;
  },
});

export const getJob = internalQuery({
  args: { jobId: v.id("reviewAiJobs") },
  returns: v.union(
    v.object({
      _id: v.id("reviewAiJobs"),
      jobType: reviewAiJobTypeValidator,
      reviewId: v.optional(v.id("productReviews")),
      productId: v.optional(v.id("products")),
      status: reviewAiJobStatusValidator,
      priority: v.number(),
      retryCount: v.number(),
      maxRetries: v.number(),
      nextRetryAt: v.optional(v.number()),
      payload: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    return {
      _id: job._id,
      jobType: job.jobType,
      reviewId: job.reviewId,
      productId: job.productId,
      status: job.status,
      priority: job.priority,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
      nextRetryAt: job.nextRetryAt,
      payload: job.payload,
    };
  },
});

export const getDueJobs = internalQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("reviewAiJobs"),
      jobType: reviewAiJobTypeValidator,
      reviewId: v.optional(v.id("productReviews")),
      productId: v.optional(v.id("products")),
      status: reviewAiJobStatusValidator,
      nextRetryAt: v.optional(v.number()),
      retryCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 10, 50);
    const now = Date.now();

    const retryJobs = await ctx.db
      .query("reviewAiJobs")
      .withIndex("by_status_next_retry", (q) =>
        q.eq("status", "retry_scheduled")
      )
      .take(100);

    const due = retryJobs
      .filter((job) => job.nextRetryAt != null && job.nextRetryAt <= now)
      .slice(0, limit);

    const pendingJobs = await ctx.db
      .query("reviewAiJobs")
      .withIndex("by_status_priority", (q) => q.eq("status", "pending"))
      .take(limit);

    return [...due, ...pendingJobs.slice(0, limit - due.length)].map((job) => ({
      _id: job._id,
      jobType: job.jobType,
      reviewId: job.reviewId,
      productId: job.productId,
      status: job.status,
      nextRetryAt: job.nextRetryAt,
      retryCount: job.retryCount,
    }));
  },
});
export const getQueueStats = internalQuery({
  args: {},
  returns: v.object({
    pending: v.number(),
    processing: v.number(),
    retryScheduled: v.number(),
    failed: v.number(),
    completedLast24h: v.number(),
    oldestPendingAgeMs: v.optional(v.number()),
  }),
  handler: async (ctx) => computeReviewAiQueueStats(ctx),
});

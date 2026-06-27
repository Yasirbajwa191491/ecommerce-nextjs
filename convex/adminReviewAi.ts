import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/requireAdmin";
import { getReviewReplyStoreContext } from "./lib/settingsHelpers";
import { computeReviewAiQueueStats } from "./lib/reviewAiQueueStats";
import {
  buildAnalyzeReviewIdempotencyKey,
  enqueueReviewAiJob,
  REVIEW_AI_PRIORITY,
} from "./lib/reviewAiQueue";
import {
  reviewAiJobStatusValidator,
  reviewAiJobTypeValidator,
  reviewAiGenerationModeValidator,
  reviewAiGenerationSourceValidator,
  reviewAiGenerationTypeValidator,
} from "./lib/aiValidators";

const generationModeArgs = {
  reviewId: v.id("productReviews"),
  mode: v.optional(reviewAiGenerationModeValidator),
};

async function emitManualGeneration(
  ctx: MutationCtx,
  args: {
    reviewId: Id<"productReviews">;
    types: string[];
    mode?: "replace" | "version" | "history_only";
  }
) {
  const review = await ctx.db.get(args.reviewId);
  if (!review) throw new ConvexError("Review not found");

  const user = await requireAdmin(ctx);
  const storeContext = await getReviewReplyStoreContext(ctx);

  await ctx.scheduler.runAfter(0, internal.n8nWebhooks.emitReviewEvent, {
    event: "review.ai.manual_generate",
    payload: JSON.stringify({
      requestId: `${args.reviewId}:${Date.now()}`,
      reviewId: args.reviewId,
      productId: review.productId,
      types: args.types,
      source: "manual",
      regenerationMode: args.mode ?? "version",
      triggeredBy: user._id,
      storeContext,
      reviewText: {
        title: review.title,
        content: review.content,
        rating: review.rating,
        customerName: review.customerName,
      },
    }),
  });
}

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

export const triggerSentimentGeneration = mutation({
  args: generationModeArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await emitManualGeneration(ctx, {
      reviewId: args.reviewId,
      types: ["sentiment"],
      mode: args.mode,
    });
    return null;
  },
});

export const triggerTagsGeneration = mutation({
  args: generationModeArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await emitManualGeneration(ctx, {
      reviewId: args.reviewId,
      types: ["tags"],
      mode: args.mode,
    });
    return null;
  },
});

export const triggerReplyGeneration = mutation({
  args: generationModeArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await emitManualGeneration(ctx, {
      reviewId: args.reviewId,
      types: ["reply"],
      mode: args.mode,
    });
    return null;
  },
});

export const triggerSummaryGeneration = mutation({
  args: generationModeArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await emitManualGeneration(ctx, {
      reviewId: args.reviewId,
      types: ["summary"],
      mode: args.mode,
    });
    return null;
  },
});

export const reprocessReview = mutation({
  args: generationModeArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.reviewId, {
      aiAnalysisStatus: "pending",
      aiError: undefined,
      updatedAt: Date.now(),
    });
    await emitManualGeneration(ctx, {
      reviewId: args.reviewId,
      types: ["sentiment", "tags", "moderation", "full_analysis"],
      mode: args.mode,
    });
    return null;
  },
});

export const regenerateAll = mutation({
  args: generationModeArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await emitManualGeneration(ctx, {
      reviewId: args.reviewId,
      types: ["sentiment", "tags", "moderation", "reply", "full_analysis"],
      mode: args.mode,
    });
    return null;
  },
});

export const getGenerationHistory = query({
  args: {
    reviewId: v.id("productReviews"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("reviewAiGenerations"),
      type: reviewAiGenerationTypeValidator,
      content: v.string(),
      provider: v.string(),
      model: v.string(),
      version: v.number(),
      isActive: v.boolean(),
      source: reviewAiGenerationSourceValidator,
      triggeredBy: v.optional(v.string()),
      durationMs: v.optional(v.number()),
      error: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 30, 100);
    const rows = await ctx.db
      .query("reviewAiGenerations")
      .withIndex("by_review_type_version", (q) =>
        q.eq("reviewId", args.reviewId)
      )
      .order("desc")
      .take(limit);

    return rows.map((row) => ({
      _id: row._id,
      type: row.type,
      content: row.content,
      provider: row.provider,
      model: row.model,
      version: row.version,
      isActive: row.isActive,
      source: row.source,
      triggeredBy: row.triggeredBy,
      durationMs: row.durationMs,
      error: row.error,
      createdAt: row.createdAt,
    }));
  },
});

export const getAiMetrics = query({
  args: { days: v.optional(v.number()) },
  returns: v.object({
    totalGenerations: v.number(),
    successCount: v.number(),
    failureCount: v.number(),
    fallbackActivations: v.number(),
    avgDurationMs: v.number(),
    byProvider: v.array(
      v.object({
        provider: v.string(),
        count: v.number(),
        successCount: v.number(),
        failureCount: v.number(),
      })
    ),
    geminiFailures: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const days = args.days ?? 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffKey = cutoff.toISOString().slice(0, 10);

    const rows = await ctx.db.query("reviewAiMetrics").take(5000);
    const recent = rows.filter((r) => r.date >= cutoffKey);

    let totalGenerations = 0;
    let successCount = 0;
    let failureCount = 0;
    let fallbackActivations = 0;
    let totalDurationMs = 0;
    let sampleCount = 0;
    let geminiFailures = 0;

    const providerMap = new Map<
      string,
      { count: number; successCount: number; failureCount: number }
    >();

    for (const row of recent) {
      const rowTotal = row.successCount + row.failureCount;
      totalGenerations += rowTotal;
      successCount += row.successCount;
      failureCount += row.failureCount;
      fallbackActivations += row.fallbackCount;
      totalDurationMs += row.totalDurationMs;
      sampleCount += row.sampleCount;

      if (row.provider === "gemini") {
        geminiFailures += row.failureCount;
      }

      const existing = providerMap.get(row.provider) ?? {
        count: 0,
        successCount: 0,
        failureCount: 0,
      };
      existing.count += rowTotal;
      existing.successCount += row.successCount;
      existing.failureCount += row.failureCount;
      providerMap.set(row.provider, existing);
    }

    return {
      totalGenerations,
      successCount,
      failureCount,
      fallbackActivations,
      avgDurationMs:
        sampleCount > 0 ? Math.round(totalDurationMs / sampleCount) : 0,
      byProvider: [...providerMap.entries()].map(([provider, stats]) => ({
        provider,
        ...stats,
      })),
      geminiFailures,
    };
  },
});

export const runHistoryBackfill = mutation({
  args: { limit: v.optional(v.number()) },
  returns: v.object({ backfilled: v.number() }),
  handler: async (ctx, args): Promise<{ backfilled: number }> => {
    await requireAdmin(ctx);
    return await ctx.runMutation(internal.reviewAiBackfill.backfillFromReviews, {
      limit: args.limit,
    });
  },
});

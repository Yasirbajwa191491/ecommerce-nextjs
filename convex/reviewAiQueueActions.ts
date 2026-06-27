"use node";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import {
  MIN_REVIEWS_FOR_SUMMARY,
  shouldRegenerateInsights,
} from "./lib/ai/constants";
import { getReviewAIProvider } from "./lib/ai/getProvider";
import {
  analyzeReview,
  extractReviewTopics,
  generateReviewReply,
  summarizeReviews,
} from "./lib/ai/reviewIntelligence";
import {
  parseRetryDelayFromGeminiError,
} from "./lib/ai/providers/shared";
import {
  REVIEW_AI_BATCH_SIZE,
  buildInsightsIdempotencyKey,
  classifyAiError,
  friendlyErrorForCode,
} from "./lib/reviewAiQueue";
import type { Id } from "./_generated/dataModel";

async function handleJobFailure(
  ctx: { runMutation: (ref: unknown, args: unknown) => Promise<unknown> },
  jobId: Id<"reviewAiJobs">,
  message: string
) {
  const errorCode = classifyAiError(message);
  const retryAfterMs = parseRetryDelayFromGeminiError(message);

  await ctx.runMutation(internal.reviewAiQueueMutations.markJobFailed, {
    jobId,
    error: message,
    errorCode,
    retryAfterMs,
  });

  return errorCode;
}

async function executeAnalyzeReview(
  ctx: { runQuery: typeof internalAction.prototype; runMutation: typeof internalAction.prototype },
  reviewId: Id<"productReviews">
) {
  const review = await ctx.runQuery(internal.reviewAiQueries.getReviewForAi, {
    reviewId,
  });
  if (!review) return;

  await ctx.runMutation(internal.reviewAi.setAnalysisStatus, {
    reviewId,
    status: "processing",
  });

  const provider = getReviewAIProvider();
  const results = await analyzeReview(provider, {
    title: review.title,
    content: review.content,
  });

  await ctx.runMutation(internal.reviewAi.applyReviewResults, {
    reviewId,
    results,
  });

  if (review.isApproved) {
    const data = await ctx.runQuery(
      internal.reviewAiQueries.getApprovedReviewTexts,
      { productId: review.productId }
    );
    await ctx.runMutation(internal.reviewAiQueueMutations.enqueueJob, {
      jobType: "regenerate_insights",
      productId: review.productId,
      idempotencyKey: buildInsightsIdempotencyKey(
        review.productId,
        data.texts.length,
        false
      ),
      payload: JSON.stringify({ force: false }),
    });
  }

  await ctx.scheduler.runAfter(0, internal.n8nWebhooks.emitReviewEvent, {
    event: "review.ai.completed",
    payload: JSON.stringify({
      reviewId,
      productId: review.productId,
      flagged: results.moderation.flagged,
      sentiment: results.sentiment,
    }),
  });
}

async function executeRegenerateInsights(
  ctx: { runQuery: typeof internalAction.prototype; runMutation: typeof internalAction.prototype; scheduler: { runAfter: Function } },
  productId: Id<"products">,
  force: boolean
) {
  const data = await ctx.runQuery(
    internal.reviewAiQueries.getApprovedReviewTexts,
    { productId }
  );

  if (data.texts.length < MIN_REVIEWS_FOR_SUMMARY) {
    return;
  }

  if (
    !force &&
    !shouldRegenerateInsights(data.texts.length, data.previousReviewCount)
  ) {
    return;
  }

  await ctx.runMutation(internal.reviewAi.setProductInsightsPending, {
    productId,
  });

  const provider = getReviewAIProvider();
  const [summary, topics] = await Promise.all([
    summarizeReviews(provider, data.texts),
    extractReviewTopics(provider, data.texts),
  ]);

  await ctx.runMutation(internal.reviewAi.upsertProductInsights, {
    productId,
    summary,
    topics,
    reviewCountAtGeneration: data.texts.length,
    status: "complete",
  });

  await ctx.scheduler.runAfter(
    0,
    internal.productAiActions.processProductIntelligence,
    { productId, force: false }
  );
}

async function executeGenerateReply(
  ctx: { runQuery: typeof internalAction.prototype; runMutation: typeof internalAction.prototype },
  reviewId: Id<"productReviews">
) {
  const review = await ctx.runQuery(internal.reviewAiQueries.getReviewForAi, {
    reviewId,
  });
  if (!review) return;

  const provider = getReviewAIProvider();
  const reply = await generateReviewReply(provider, {
    rating: review.rating,
    title: review.title,
    content: review.content,
    customerName: review.customerName,
  });

  await ctx.runMutation(internal.reviewAi.setReplyDraft, {
    reviewId,
    draft: reply.trim(),
  });
}

async function executeJob(
  ctx: Parameters<typeof processNextJob.handler>[0],
  jobId: Id<"reviewAiJobs">
) {
  const job = await ctx.runQuery(internal.reviewAiQueueMutations.getJob, {
    jobId,
  });
  if (!job) return;

  try {
    if (job.jobType === "analyze_review") {
      if (!job.reviewId) throw new Error("Missing reviewId for analyze_review");
      await executeAnalyzeReview(ctx, job.reviewId);
    } else if (job.jobType === "regenerate_insights") {
      if (!job.productId) {
        throw new Error("Missing productId for regenerate_insights");
      }
      const payload = job.payload ? JSON.parse(job.payload) as { force?: boolean } : {};
      await executeRegenerateInsights(ctx, job.productId, payload.force ?? false);
    } else if (job.jobType === "generate_reply") {
      if (!job.reviewId) throw new Error("Missing reviewId for generate_reply");
      await executeGenerateReply(ctx, job.reviewId);
    } else if (job.jobType === "bulk_reprocess") {
      if (!job.reviewId) throw new Error("Missing reviewId for bulk_reprocess");
      await executeAnalyzeReview(ctx, job.reviewId);
    } else {
      throw new Error(`Unknown job type: ${job.jobType}`);
    }

    await ctx.runMutation(internal.reviewAiQueueMutations.markJobCompleted, {
      jobId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI job failed";
    const errorCode = await handleJobFailure(ctx, jobId, message);

    if (job.jobType === "analyze_review" && job.reviewId) {
      const reviewStatus =
        errorCode === "permanent" ? "failed" : "retry_scheduled";
      await ctx.runMutation(internal.reviewAi.setAnalysisStatus, {
        reviewId: job.reviewId,
        status: reviewStatus,
        error:
          errorCode === "permanent"
            ? message
            : friendlyErrorForCode(errorCode),
      });
    }

    if (job.jobType === "regenerate_insights" && job.productId) {
      if (errorCode === "permanent") {
        const data = await ctx.runQuery(
          internal.reviewAiQueries.getApprovedReviewTexts,
          { productId: job.productId }
        );
        await ctx.runMutation(internal.reviewAi.upsertProductInsights, {
          productId: job.productId,
          summary: "",
          topics: [],
          reviewCountAtGeneration: data.texts.length,
          status: "failed",
        });
      }
    }

    if (job.jobType === "generate_reply" && job.reviewId) {
      const friendly =
        errorCode !== "permanent"
          ? friendlyErrorForCode(errorCode)
          : message.includes("503") || message.includes("429")
            ? "The AI provider is temporarily busy. Please click Generate Reply again in a minute."
            : message;
      await ctx.runMutation(internal.reviewAi.setReplyError, {
        reviewId: job.reviewId,
        error: friendly,
      });
    }
  }
}

export const processNextJob = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    for (let i = 0; i < REVIEW_AI_BATCH_SIZE; i++) {
      const jobId = await ctx.runMutation(
        internal.reviewAiQueueMutations.claimNextJob,
        {}
      );
      if (!jobId) break;

      await executeJob(ctx, jobId);
    }

    const dueJobs = await ctx.runQuery(
      internal.reviewAiQueueMutations.getDueJobs,
      { limit: 1 }
    );
    if (dueJobs.length > 0) {
      await ctx.scheduler.runAfter(1000, internal.reviewAiQueueActions.processNextJob, {});
    }

    return null;
  },
});

export const processJobById = internalAction({
  args: { jobId: v.id("reviewAiJobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const claimed = await ctx.runMutation(
      internal.reviewAiQueueMutations.claimJobById,
      { jobId: args.jobId }
    );
    if (!claimed) return null;

    await executeJob(ctx, args.jobId);
    return null;
  },
});

export const processDueJobs = internalAction({
  args: { limit: v.optional(v.number()) },
  returns: v.object({ processed: v.number() }),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 10, 50);
    let processed = 0;

    for (let i = 0; i < limit; i++) {
      const jobId = await ctx.runMutation(
        internal.reviewAiQueueMutations.claimNextJob,
        {}
      );
      if (!jobId) break;
      await executeJob(ctx, jobId);
      processed += 1;
    }

    return { processed };
  },
});

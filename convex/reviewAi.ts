import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  aiAnalysisStatusValidator,
  aiModerationValidator,
  aiSentimentValidator,
  productInsightsStatusValidator,
  reviewTopicValidator,
} from "./lib/aiValidators";
import {
  clearTagIndexForReview,
  syncTagIndexApproval as syncTagIndexApprovalHelper,
  syncTagIndexForReview as syncTagIndexForReviewHelper,
} from "./lib/ai/tagIndex";
import { isVersioningEnabled } from "./lib/ai/featureFlags";
import { recordGeneration } from "./lib/ai/generationHistory";

const reviewAnalysisResultValidator = v.object({
  sentiment: aiSentimentValidator,
  sentimentConfidence: v.number(),
  tags: v.array(v.string()),
  moderation: aiModerationValidator,
  embedding: v.array(v.float64()),
  provider: v.optional(v.string()),
  model: v.optional(v.string()),
  durationMs: v.optional(v.number()),
  jobId: v.optional(v.id("reviewAiJobs")),
});

export const setAnalysisStatus = internalMutation({
  args: {
    reviewId: v.id("productReviews"),
    status: aiAnalysisStatusValidator,
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review) return null;

    await ctx.db.patch(args.reviewId, {
      aiAnalysisStatus: args.status,
      aiError: args.error,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const applyReviewResults = internalMutation({
  args: {
    reviewId: v.id("productReviews"),
    results: reviewAnalysisResultValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review) return null;

    const now = Date.now();
    await ctx.db.patch(args.reviewId, {
      aiAnalysisStatus: "complete",
      aiSentiment: args.results.sentiment,
      aiSentimentConfidence: args.results.sentimentConfidence,
      aiTags: args.results.tags.length ? args.results.tags : undefined,
      aiModeration: args.results.moderation,
      embedding: args.results.embedding,
      aiAnalyzedAt: now,
      aiError: undefined,
      updatedAt: now,
    });

    await syncTagIndexForReviewHelper(ctx, {
      reviewId: args.reviewId,
      productId: review.productId,
      isApproved: review.isApproved,
      tags: args.results.tags,
    });

    if (isVersioningEnabled()) {
      const content = JSON.stringify({
        sentiment: args.results.sentiment,
        sentimentConfidence: args.results.sentimentConfidence,
        tags: args.results.tags,
        moderation: args.results.moderation,
      });
      await recordGeneration(ctx, {
        reviewId: args.reviewId,
        productId: review.productId,
        type: "full_analysis",
        content,
        provider: args.results.provider ?? "gemini",
        model: args.results.model ?? "unknown",
        source: "automatic",
        triggeredBy: "system",
        jobId: args.results.jobId,
        durationMs: args.results.durationMs,
        mode: "version",
      });

      await ctx.db.patch(args.reviewId, {
        aiActiveGenerationVersion: (
          await ctx.db
            .query("reviewAiGenerations")
            .withIndex("by_review_type_version", (q) =>
              q.eq("reviewId", args.reviewId).eq("type", "full_analysis")
            )
            .order("desc")
            .take(1)
        )[0]?.version,
      });
    }

    await ctx.scheduler.runAfter(0, internal.reviewAiMetrics.recordMetric, {
      provider: args.results.provider ?? "gemini",
      type: "full_analysis",
      success: true,
      durationMs: args.results.durationMs,
    });

    return null;
  },
});

export const syncTagIndexForReview = internalMutation({
  args: {
    reviewId: v.id("productReviews"),
    productId: v.id("products"),
    isApproved: v.boolean(),
    tags: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await syncTagIndexForReviewHelper(ctx, args);
    return null;
  },
});

export const syncTagIndexApproval = internalMutation({
  args: {
    reviewId: v.id("productReviews"),
    isApproved: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await syncTagIndexApprovalHelper(ctx, args.reviewId, args.isApproved);
    return null;
  },
});

export const setReplyDraft = internalMutation({
  args: {
    reviewId: v.id("productReviews"),
    draft: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review) return null;

    await ctx.db.patch(args.reviewId, {
      adminReplyDraft: args.draft,
      adminReplyError: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const setReplyError = internalMutation({
  args: {
    reviewId: v.id("productReviews"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review) return null;

    await ctx.db.patch(args.reviewId, {
      adminReplyError: args.error,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const upsertProductInsights = internalMutation({
  args: {
    productId: v.id("products"),
    summary: v.string(),
    topics: v.array(reviewTopicValidator),
    reviewCountAtGeneration: v.number(),
    status: productInsightsStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("productReviewInsights")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        summary: args.summary,
        topics: args.topics,
        reviewCountAtGeneration: args.reviewCountAtGeneration,
        generatedAt: now,
        aiAnalysisStatus: args.status,
      });
    } else {
      await ctx.db.insert("productReviewInsights", {
        productId: args.productId,
        summary: args.summary,
        topics: args.topics,
        reviewCountAtGeneration: args.reviewCountAtGeneration,
        generatedAt: now,
        aiAnalysisStatus: args.status,
      });
    }

    return null;
  },
});

export const setProductInsightsPending = internalMutation({
  args: { productId: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("productReviewInsights")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { aiAnalysisStatus: "pending" });
    } else {
      await ctx.db.insert("productReviewInsights", {
        productId: args.productId,
        summary: "",
        topics: [],
        reviewCountAtGeneration: 0,
        generatedAt: Date.now(),
        aiAnalysisStatus: "pending",
      });
    }

    return null;
  },
});

export const clearReviewAiFields = internalMutation({
  args: { reviewId: v.id("productReviews") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review) return null;

    await clearTagIndexForReview(ctx, args.reviewId);

    await ctx.db.patch(args.reviewId, {
      aiAnalysisStatus: "pending",
      aiSentiment: undefined,
      aiSentimentConfidence: undefined,
      aiTags: undefined,
      aiModeration: undefined,
      embedding: undefined,
      aiAnalyzedAt: undefined,
      aiError: undefined,
      updatedAt: Date.now(),
    });

    return null;
  },
});

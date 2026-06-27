import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
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

const reviewAnalysisResultValidator = v.object({
  sentiment: aiSentimentValidator,
  sentimentConfidence: v.number(),
  tags: v.array(v.string()),
  moderation: aiModerationValidator,
  embedding: v.array(v.float64()),
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

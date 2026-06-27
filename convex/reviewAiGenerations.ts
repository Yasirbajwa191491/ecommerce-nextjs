import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  reviewAiGenerationSourceValidator,
  reviewAiGenerationTypeValidator,
} from "./lib/aiValidators";
import { recordGeneration } from "./lib/ai/generationHistory";
import type { ReviewAiGenerationMode } from "./lib/ai/types";
import { isVersioningEnabled } from "./lib/ai/featureFlags";
import { syncTagIndexForReview as syncTagIndexForReviewHelper } from "./lib/ai/tagIndex";

export const listByReview = internalQuery({
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
    const limit = Math.min(args.limit ?? 50, 100);
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

export const saveGenerationFromN8n = internalMutation({
  args: {
    reviewId: v.id("productReviews"),
    productId: v.optional(v.id("products")),
    type: reviewAiGenerationTypeValidator,
    content: v.string(),
    provider: v.string(),
    model: v.string(),
    source: reviewAiGenerationSourceValidator,
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
  },
  returns: v.id("reviewAiGenerations"),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error("Review not found");

    const mode = (args.mode ?? "version") as ReviewAiGenerationMode;
    const generationId = await recordGeneration(ctx, {
      reviewId: args.reviewId,
      productId: args.productId ?? review.productId,
      type: args.type,
      content: args.content,
      provider: args.provider,
      model: args.model,
      source: args.source,
      triggeredBy: args.triggeredBy,
      jobId: args.jobId,
      durationMs: args.durationMs,
      mode,
    });

    if (!generationId) {
      throw new Error("Failed to record generation");
    }

    const shouldApply = args.applyToReview !== false && mode !== "history_only";

    if (shouldApply) {
      await applyGenerationContent(ctx, {
        reviewId: args.reviewId,
        productId: args.productId ?? review.productId,
        type: args.type,
        content: args.content,
        isApproved: review.isApproved,
      });
    }

    return generationId;
  },
});

async function applyGenerationContent(
  ctx: MutationCtx,
  args: {
    reviewId: Id<"productReviews">;
    productId: Id<"products">;
    type: string;
    content: string;
    isApproved: boolean;
  }
) {
  const now = Date.now();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(args.content) as Record<string, unknown>;
  } catch {
    parsed = { raw: args.content };
  }

  const patch: Record<string, unknown> = { updatedAt: now };

  switch (args.type) {
    case "sentiment": {
      patch.aiSentiment = parsed.sentiment;
      patch.aiSentimentConfidence = parsed.confidence;
      break;
    }
    case "tags": {
      const tags = Array.isArray(parsed.tags) ? (parsed.tags as string[]) : [];
      patch.aiTags = tags.length ? tags : undefined;
      if (tags.length) {
        await syncTagIndexForReviewHelper(ctx, {
          reviewId: args.reviewId,
          productId: args.productId,
          isApproved: args.isApproved,
          tags,
        });
      }
      break;
    }
    case "moderation": {
      patch.aiModeration = parsed;
      break;
    }
    case "reply": {
      patch.adminReplyDraft =
        typeof parsed.reply === "string" ? parsed.reply : String(parsed.raw ?? args.content);
      patch.adminReplyError = undefined;
      break;
    }
    case "full_analysis": {
      patch.aiAnalysisStatus = "complete";
      patch.aiSentiment = parsed.sentiment;
      patch.aiSentimentConfidence = parsed.sentimentConfidence;
      patch.aiTags = Array.isArray(parsed.tags) ? parsed.tags : undefined;
      patch.aiModeration = parsed.moderation;
      if (Array.isArray(parsed.embedding)) {
        patch.embedding = parsed.embedding;
      }
      patch.aiAnalyzedAt = now;
      patch.aiError = undefined;
      if (Array.isArray(parsed.tags)) {
        await syncTagIndexForReviewHelper(ctx, {
          reviewId: args.reviewId,
          productId: args.productId,
          isApproved: args.isApproved,
          tags: parsed.tags as string[],
        });
      }
      break;
    }
    case "summary": {
      const existing = await ctx.db
        .query("productReviewInsights")
        .withIndex("by_product", (q) => q.eq("productId", args.productId))
        .unique();
      const summary =
        typeof parsed.summary === "string" ? parsed.summary : args.content;
      if (existing) {
        await ctx.db.patch(existing._id, {
          summary,
          generatedAt: now,
          aiAnalysisStatus: "complete",
        });
      } else {
        await ctx.db.insert("productReviewInsights", {
          productId: args.productId,
          summary,
          topics: [],
          reviewCountAtGeneration: 0,
          generatedAt: now,
          aiAnalysisStatus: "complete",
        });
      }
      break;
    }
    case "topics": {
      const existing = await ctx.db
        .query("productReviewInsights")
        .withIndex("by_product", (q) => q.eq("productId", args.productId))
        .unique();
      const topics = Array.isArray(parsed.topics) ? parsed.topics : [];
      if (existing) {
        await ctx.db.patch(existing._id, {
          topics: topics as Array<{ name: string; mentionCount: number }>,
          generatedAt: now,
          aiAnalysisStatus: "complete",
        });
      }
      break;
    }
  }

  if (Object.keys(patch).length > 1) {
    await ctx.db.patch(args.reviewId, patch);
  }
}

export const recordAutomaticGeneration = internalMutation({
  args: {
    reviewId: v.id("productReviews"),
    type: reviewAiGenerationTypeValidator,
    content: v.string(),
    provider: v.string(),
    model: v.string(),
    jobId: v.optional(v.id("reviewAiJobs")),
    durationMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!isVersioningEnabled()) return null;

    const review = await ctx.db.get(args.reviewId);
    if (!review) return null;

    await recordGeneration(ctx, {
      reviewId: args.reviewId,
      productId: review.productId,
      type: args.type,
      content: args.content,
      provider: args.provider,
      model: args.model,
      source: "automatic",
      triggeredBy: "system",
      jobId: args.jobId,
      durationMs: args.durationMs,
      mode: "version",
    });

    return null;
  },
});

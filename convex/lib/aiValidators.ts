import { v } from "convex/values";

export const aiAnalysisStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("complete"),
  v.literal("failed")
);

export const aiSentimentValidator = v.union(
  v.literal("positive"),
  v.literal("neutral"),
  v.literal("negative")
);

export const aiModerationValidator = v.object({
  flagged: v.boolean(),
  reason: v.optional(v.string()),
});

export const reviewTopicValidator = v.object({
  name: v.string(),
  mentionCount: v.number(),
});

export const productInsightsStatusValidator = v.union(
  v.literal("pending"),
  v.literal("complete"),
  v.literal("failed")
);

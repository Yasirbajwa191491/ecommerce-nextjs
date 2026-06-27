import { v } from "convex/values";

export const aiAnalysisStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("complete"),
  v.literal("failed"),
  v.literal("retry_scheduled")
);

export const reviewAiJobTypeValidator = v.union(
  v.literal("analyze_review"),
  v.literal("regenerate_insights"),
  v.literal("generate_reply"),
  v.literal("bulk_reprocess")
);

export const reviewAiJobStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("retry_scheduled")
);

export const reviewAiJobErrorCodeValidator = v.union(
  v.literal("quota"),
  v.literal("transient"),
  v.literal("permanent")
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

export const reviewAiGenerationTypeValidator = v.union(
  v.literal("sentiment"),
  v.literal("tags"),
  v.literal("moderation"),
  v.literal("reply"),
  v.literal("summary"),
  v.literal("topics"),
  v.literal("full_analysis")
);

export const reviewAiGenerationSourceValidator = v.union(
  v.literal("automatic"),
  v.literal("manual"),
  v.literal("fallback")
);

export const reviewAiGenerationModeValidator = v.union(
  v.literal("replace"),
  v.literal("version"),
  v.literal("history_only")
);

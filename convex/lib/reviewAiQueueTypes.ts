export type ReviewAiJobType =
  | "analyze_review"
  | "regenerate_insights"
  | "generate_reply"
  | "bulk_reprocess";

export type ReviewAiJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "retry_scheduled";

export type ReviewAiJobErrorCode = "quota" | "transient" | "permanent";

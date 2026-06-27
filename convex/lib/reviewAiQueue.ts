import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type {
  ReviewAiJobErrorCode,
  ReviewAiJobType,
} from "./reviewAiQueueTypes";

export const REVIEW_AI_BATCH_SIZE = 1;
export const MAX_REVIEW_AI_RETRIES = 8;
export const BASE_RETRY_DELAY_MS = 60_000;
export const QUOTA_RETRY_DELAY_MS = 3_600_000;

export const REVIEW_AI_PRIORITY = {
  high: 1,
  normal: 5,
  bulk: 10,
} as const;

export const FRIENDLY_QUOTA_MESSAGE =
  "AI analysis is queued — Gemini rate limit reached. Processing will retry automatically.";

export const FRIENDLY_TRANSIENT_MESSAGE =
  "AI analysis is temporarily unavailable. Processing will retry automatically.";

export type EnqueueReviewAiJobArgs = {
  jobType: ReviewAiJobType;
  reviewId?: Id<"productReviews">;
  productId?: Id<"products">;
  priority?: number;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  maxRetries?: number;
};

export function computeRetryDelayMs(
  retryCount: number,
  errorCode: ReviewAiJobErrorCode,
  retryAfterMs?: number
): number {
  if (retryAfterMs != null && retryAfterMs > 0) {
    return Math.min(retryAfterMs, QUOTA_RETRY_DELAY_MS);
  }
  if (errorCode === "quota") {
    return QUOTA_RETRY_DELAY_MS;
  }
  const exponential = BASE_RETRY_DELAY_MS * 2 ** Math.min(retryCount, 4);
  return Math.min(exponential, 15 * 60_000);
}

export function classifyAiError(message: string): ReviewAiJobErrorCode {
  const lower = message.toLowerCase();
  if (
    lower.includes("429") &&
    (lower.includes("quota") ||
      lower.includes("resource_exhausted") ||
      lower.includes("free_tier") ||
      lower.includes("free tier"))
  ) {
    return "quota";
  }
  if (
    lower.includes("503") ||
    lower.includes("502") ||
    lower.includes("504") ||
    lower.includes("500") ||
    (lower.includes("429") && !lower.includes("quota"))
  ) {
    return "transient";
  }
  return "permanent";
}

export function friendlyErrorForCode(code: ReviewAiJobErrorCode): string {
  if (code === "quota") return FRIENDLY_QUOTA_MESSAGE;
  if (code === "transient") return FRIENDLY_TRANSIENT_MESSAGE;
  return "AI analysis failed. Please retry manually.";
}

export async function findExistingActiveJob(
  ctx: MutationCtx,
  idempotencyKey: string
) {
  const existing = await ctx.db
    .query("reviewAiJobs")
    .withIndex("by_idempotency", (q) => q.eq("idempotencyKey", idempotencyKey))
    .unique();

  if (!existing) return null;
  if (
    existing.status === "pending" ||
    existing.status === "processing" ||
    existing.status === "retry_scheduled"
  ) {
    return existing;
  }
  return null;
}

export function buildAnalyzeReviewIdempotencyKey(
  reviewId: Id<"productReviews">,
  title: string,
  content: string
): string {
  const hash = simpleHash(`${title}\0${content}`);
  return `analyze_review:${reviewId}:${hash}`;
}

export function buildInsightsIdempotencyKey(
  productId: Id<"products">,
  reviewCount: number,
  force: boolean
): string {
  return `regenerate_insights:${productId}:${reviewCount}:${force ? "force" : "auto"}`;
}

export function buildReplyIdempotencyKey(
  reviewId: Id<"productReviews">
): string {
  return `generate_reply:${reviewId}:${Date.now()}`;
}

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function enqueueReviewAiJob(
  ctx: MutationCtx,
  args: EnqueueReviewAiJobArgs
): Promise<Id<"reviewAiJobs">> {
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
    payload: args.payload ? JSON.stringify(args.payload) : undefined,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.scheduler.runAfter(0, internal.reviewAiQueueActions.processNextJob, {});

  return jobId;
}

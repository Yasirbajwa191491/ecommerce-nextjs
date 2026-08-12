import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import {
  CONVEX_RECOMMENDATION_FALLBACK_DELAY_MS,
  RECOMMENDATION_JOB_MAX_ATTEMPTS,
} from "./constants";
import { getRecommendationSettings } from "./settings";
import type { Infer } from "convex/values";
import { recommendationJobTypeValidator } from "./validators";

type RecommendationJobType = Infer<typeof recommendationJobTypeValidator>;

export async function findActiveRecommendationJob(
  ctx: MutationCtx,
  idempotencyKey: string
) {
  const matches = await ctx.db
    .query("recommendationJobs")
    .withIndex("by_idempotency", (q) => q.eq("idempotencyKey", idempotencyKey))
    .take(20);

  return (
    matches.find(
      (job) =>
        job.status === "pending" ||
        job.status === "processing" ||
        job.status === "retry_scheduled"
    ) ?? null
  );
}

export async function scheduleRecommendationRefresh(
  ctx: MutationCtx,
  args: {
    identityType?: "visitor" | "customer";
    identityKey?: string;
    productId?: Id<"products">;
    jobType: RecommendationJobType;
    triggeredBy?: string;
    debounceMs?: number;
  }
) {
  const settings = await getRecommendationSettings(ctx);
  if (!settings.personalizationEnabled && args.jobType !== "co_occurrence_rebuild") {
    return null;
  }

  const idempotencyKey = [
    args.jobType,
    args.identityType ?? "global",
    args.identityKey ?? "global",
    args.productId ?? "none",
  ].join(":");

  const existing = await findActiveRecommendationJob(ctx, idempotencyKey);
  if (existing) return existing._id;

  const now = Date.now();
  const jobId = await ctx.db.insert("recommendationJobs", {
    jobType: args.jobType,
    status: "pending",
    identityType: args.identityType,
    identityKey: args.identityKey,
    productId: args.productId,
    attempts: 0,
    maxAttempts: RECOMMENDATION_JOB_MAX_ATTEMPTS,
    idempotencyKey,
    triggeredBy: args.triggeredBy,
    nextRetryAt: now + (args.debounceMs ?? 0),
    createdAt: now,
    updatedAt: now,
  });

  if (settings.n8nEnabled) {
    await ctx.scheduler.runAfter(0, internal.n8nWebhooks.emitReviewEvent, {
      event: "recommendation.profile_refresh_requested",
      payload: JSON.stringify({
        jobId,
        jobType: args.jobType,
        identityType: args.identityType,
        identityKey: args.identityKey,
        productId: args.productId,
      }),
    });
  }

  await ctx.scheduler.runAfter(
    CONVEX_RECOMMENDATION_FALLBACK_DELAY_MS,
    internal.recommendationActions.processRecommendationJob,
    { jobId }
  );

  return jobId;
}

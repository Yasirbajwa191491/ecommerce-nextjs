import type { MutationCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import type {
  ReviewAiGenerationMode,
  ReviewAiGenerationSource,
  ReviewAiGenerationType,
} from "./types";
import { isVersioningEnabled } from "./featureFlags";

export async function getNextVersion(
  ctx: MutationCtx,
  reviewId: Id<"productReviews">,
  type: ReviewAiGenerationType
): Promise<number> {
  const existing = await ctx.db
    .query("reviewAiGenerations")
    .withIndex("by_review_type_version", (q) =>
      q.eq("reviewId", reviewId).eq("type", type)
    )
    .order("desc")
    .take(1);

  return existing.length > 0 ? existing[0].version + 1 : 1;
}

export async function deactivatePreviousGenerations(
  ctx: MutationCtx,
  reviewId: Id<"productReviews">,
  type: ReviewAiGenerationType
): Promise<void> {
  const active = await ctx.db
    .query("reviewAiGenerations")
    .withIndex("by_review_active", (q) =>
      q.eq("reviewId", reviewId).eq("isActive", true)
    )
    .collect();

  for (const gen of active) {
    if (gen.type === type) {
      await ctx.db.patch(gen._id, { isActive: false });
    }
  }
}

export type RecordGenerationArgs = {
  reviewId: Id<"productReviews">;
  productId?: Id<"products">;
  type: ReviewAiGenerationType;
  content: string;
  provider: string;
  model: string;
  source: ReviewAiGenerationSource;
  triggeredBy?: string;
  jobId?: Id<"reviewAiJobs">;
  durationMs?: number;
  error?: string;
  mode?: ReviewAiGenerationMode;
};

export async function recordGeneration(
  ctx: MutationCtx,
  args: RecordGenerationArgs
): Promise<Id<"reviewAiGenerations"> | null> {
  if (!isVersioningEnabled() && args.mode === "history_only") {
    return null;
  }

  const mode = args.mode ?? "version";
  const version = await getNextVersion(ctx, args.reviewId, args.type);

  if (mode === "replace" || mode === "version") {
    await deactivatePreviousGenerations(ctx, args.reviewId, args.type);
  }

  const isActive = mode !== "history_only";

  return await ctx.db.insert("reviewAiGenerations", {
    reviewId: args.reviewId,
    productId: args.productId,
    type: args.type,
    content: args.content,
    provider: args.provider,
    model: args.model,
    version,
    isActive,
    source: args.source,
    triggeredBy: args.triggeredBy,
    jobId: args.jobId,
    durationMs: args.durationMs,
    error: args.error,
    createdAt: Date.now(),
  });
}

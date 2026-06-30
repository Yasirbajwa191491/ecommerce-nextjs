import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { isImageEmbeddingN8nEnabled } from "./featureFlags";
import {
  buildImageEmbeddingIdempotencyKey,
  computeImageContentHash,
} from "./imageEmbeddingHelpers";

export const IMAGE_EMBEDDING_BATCH_SIZE = 5;
export const IMAGE_EMBEDDING_MAX_ATTEMPTS = 5;
export const CONVEX_FALLBACK_DELAY_MS = 30_000;

export async function findActiveImageEmbeddingJob(
  ctx: MutationCtx,
  idempotencyKey: string
) {
  const matches = await ctx.db
    .query("imageEmbeddingJobs")
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

async function enqueueImageEmbeddingJob(
  ctx: MutationCtx,
  args: {
    productId: Id<"products">;
    triggeredBy?: string;
    force?: boolean;
  }
) {
  const product = await ctx.db.get(args.productId);
  if (!product || product.active === false) return null;

  const contentHash = computeImageContentHash(product);
  if (!contentHash) return null;

  if (
    !args.force &&
    product.imageEmbeddingContentHash === contentHash &&
    product.imageEmbeddingStatus === "complete"
  ) {
    return null;
  }

  const idempotencyKey = buildImageEmbeddingIdempotencyKey(
    args.productId,
    contentHash
  );

  const existing = await findActiveImageEmbeddingJob(ctx, idempotencyKey);
  if (existing) return existing._id;

  const now = Date.now();
  const jobId = await ctx.db.insert("imageEmbeddingJobs", {
    productId: args.productId,
    status: "pending",
    attempts: 0,
    maxAttempts: IMAGE_EMBEDDING_MAX_ATTEMPTS,
    triggeredBy: args.triggeredBy ?? "product_save",
    idempotencyKey,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.patch(args.productId, {
    imageEmbeddingStatus: "pending",
  });

  if (isImageEmbeddingN8nEnabled()) {
    await ctx.scheduler.runAfter(0, internal.n8nWebhooks.emitReviewEvent, {
      event: "product.image.embedding_requested",
      payload: JSON.stringify({
        jobId,
        productId: args.productId,
        contentHash,
      }),
    });
  }

  await ctx.scheduler.runAfter(
    CONVEX_FALLBACK_DELAY_MS,
    internal.imageEmbeddingActions.processJobById,
    { jobId }
  );

  return jobId;
}

export async function scheduleImageEmbeddingIfNeeded(
  ctx: MutationCtx,
  productId: Id<"products">,
  options?: { force?: boolean }
) {
  await enqueueImageEmbeddingJob(ctx, {
    productId,
    force: options?.force,
    triggeredBy: options?.force ? "admin_force" : "product_save",
  });
}

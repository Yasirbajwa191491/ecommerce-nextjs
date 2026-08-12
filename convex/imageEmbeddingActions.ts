"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { callImageEmbedApi } from "./lib/ai/imageEmbeddingClient";
import { recordProviderFailure, recordProviderSuccess } from "./lib/ai/providerHealth";
import { IMAGE_EMBEDDING_BATCH_SIZE } from "./lib/ai/scheduleImageEmbedding";

export const processJobById = internalAction({
  args: { jobId: v.id("imageEmbeddingJobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.imageEmbeddingQueries.getJobById, {
      jobId: args.jobId,
    });
    if (!job || job.status === "complete") return null;

    const claimed = await ctx.runMutation(
      internal.imageEmbeddingMutations.claimImageEmbeddingJob,
      { jobId: args.jobId }
    );
    if (!claimed) return null;

    const productData = await ctx.runQuery(
      internal.imageEmbeddingQueries.getProductForImageEmbedding,
      { productId: job.productId }
    );

    if (!productData) {
      await ctx.runMutation(
        internal.imageEmbeddingMutations.markImageEmbeddingJobFailed,
        {
          jobId: args.jobId,
          error: "Product has no embeddable image",
          scheduleRetry: false,
        }
      );
      return null;
    }

    if (
      productData.imageEmbeddingContentHash === productData.contentHash &&
      productData.jobStatus === "complete"
    ) {
      const now = Date.now();
      await ctx.runMutation(internal.imageEmbeddingMutations.markJobCompleteOnly, {
        jobId: args.jobId,
        completedAt: now,
      });
      return null;
    }

    try {
      const result = await callImageEmbedApi({ imageUrl: productData.imageUrl });

      await recordProviderSuccess(ctx, result.provider);

      await ctx.runMutation(internal.imageEmbeddingMutations.applyImageEmbedding, {
        productId: productData.productId,
        embedding: result.embedding,
        provider: result.provider,
        model: result.model,
        contentHash: productData.contentHash,
        jobId: args.jobId,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Image embedding failed";
      await recordProviderFailure(ctx, "siglip");
      await recordProviderFailure(ctx, "clip");
      await ctx.runMutation(
        internal.imageEmbeddingMutations.markImageEmbeddingJobFailed,
        { jobId: args.jobId, error: message }
      );
    }

    return null;
  },
});

export const processDueJobs = internalAction({
  args: { limit: v.optional(v.number()) },
  returns: v.object({ processed: v.number() }),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? IMAGE_EMBEDDING_BATCH_SIZE, 20);
    const jobs = await ctx.runQuery(internal.imageEmbeddingQueries.getDueJobs, {
      limit,
    });

    let processed = 0;
    for (const job of jobs) {
      await ctx.runAction(internal.imageEmbeddingActions.processJobById, {
        jobId: job._id,
      });
      processed += 1;
    }

    return { processed };
  },
});

export const backfillImageEmbeddings = internalAction({
  args: { limit: v.optional(v.number()) },
  returns: v.object({ scheduled: v.number() }),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? IMAGE_EMBEDDING_BATCH_SIZE, 50);
    const productIds = await ctx.runQuery(
      internal.imageEmbeddingQueries.listProductsNeedingImageEmbedding,
      { limit }
    );

    let scheduled = 0;
    for (const productId of productIds) {
      await ctx.runMutation(internal.adminImageEmbeddings.enqueueImageEmbedding, {
        productId,
        force: true,
      });
      scheduled += 1;
    }

    return { scheduled };
  },
});

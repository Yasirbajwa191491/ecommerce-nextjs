"use node";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import {
  buildProductEmbeddingText,
  computeProductContentHash,
  embedProductText,
  generateProductIntelligence,
} from "./lib/ai/productIntelligence";
import { isGeminiQuotaError } from "./lib/ai/providers/shared";

const BACKFILL_BATCH_SIZE = 5;

export const processProductIntelligence = internalAction({
  args: {
    productId: v.id("products"),
    force: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(
      internal.productAiQueries.getProductForIntelligence,
      { productId: args.productId }
    );

    if (!data) return null;

    const contentHash = computeProductContentHash(
      {
        name: data.name,
        company: data.company,
        description: data.description,
        categoryId: data.categoryId,
        price: data.price,
      },
      data.reviewHighlights
    );

    if (
      !args.force &&
      data.embeddingContentHash === contentHash &&
      data.embeddingContentHash
    ) {
      return null;
    }

    await ctx.runMutation(internal.productAi.setEmbeddingStatus, {
      productId: args.productId,
      status: "processing",
    });

    try {
      const intelligence = await generateProductIntelligence({
        name: data.name,
        company: data.company,
        description: data.description,
        price: data.price,
        currency: data.currency,
        stars: data.stars,
        reviews: data.reviews,
        categoryName: data.categoryName,
        reviewHighlights: data.reviewHighlights,
      });

      const embeddingText = buildProductEmbeddingText(
        {
          name: data.name,
          company: data.company,
          description: data.description,
          price: data.price,
          currency: data.currency,
          stars: data.stars,
          reviews: data.reviews,
          categoryName: data.categoryName,
          reviewHighlights: data.reviewHighlights,
        },
        intelligence
      );

      const embedding = await embedProductText(embeddingText);

      await ctx.runMutation(internal.productAi.applyProductIntelligence, {
        productId: args.productId,
        summary: intelligence.summary,
        keywords: intelligence.keywords,
        useCases: intelligence.useCases,
        highlights: intelligence.highlights,
        reviewHighlights: data.reviewHighlights,
        contentHash,
        embedding,
        status: "complete",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Product AI failed";

      if (isGeminiQuotaError(message)) {
        console.warn(
          "Product intelligence skipped: Gemini API quota exhausted. Image and product saves are unaffected."
        );
        const restoreStatus =
          data.embeddingStatus === "processing"
            ? data.embeddingContentHash
              ? "complete"
              : "pending"
            : data.embeddingStatus ?? "pending";
        await ctx.runMutation(internal.productAi.setEmbeddingStatus, {
          productId: args.productId,
          status: restoreStatus,
        });
        return null;
      }

      console.error("Product intelligence failed:", message);
      await ctx.runMutation(internal.productAi.setEmbeddingStatus, {
        productId: args.productId,
        status: "failed",
      });
    }

    return null;
  },
});

export const backfillAllProducts = internalAction({
  args: { cursor: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const batch = await ctx.runQuery(
      internal.productAiQueries.listProductsNeedingEmbedding,
      { cursor: args.cursor, batchSize: BACKFILL_BATCH_SIZE }
    );

    for (const productId of batch.productIds) {
      await ctx.runAction(internal.productAiActions.processProductIntelligence, {
        productId,
        force: true,
      });
    }

    if (!batch.isDone && batch.nextCursor !== undefined) {
      await ctx.scheduler.runAfter(
        1000,
        internal.productAiActions.backfillAllProducts,
        { cursor: batch.nextCursor }
      );
    }

    return null;
  },
});

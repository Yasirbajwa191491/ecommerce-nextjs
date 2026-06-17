"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { generateProductPricingRecommendation } from "./lib/ai/productPricingGeneration";
import {
  productPricingContextValidator,
  productPricingResultValidator,
  type ProductPricingResult,
} from "./lib/ai/productPricingTypes";

const CACHE_TTL_MS = 60 * 60 * 1000;

export const generateProductPricingAction = action({
  args: {
    context: productPricingContextValidator,
  },
  returns: productPricingResultValidator,
  handler: async (ctx, args): Promise<ProductPricingResult> => {
    const session: { adminUserId: string } = await ctx.runQuery(
      internal.aiBusinessCopilotQueries.getAdminSession,
      {}
    );

    const rateLimit = await ctx.runMutation(
      internal.aiCopilotRateLimit.checkProductPricingRateLimit,
      { adminUserId: session.adminUserId }
    );
    if (!rateLimit.allowed) {
      const retryMinutes = Math.ceil(rateLimit.retryAfterMs / 60000);
      throw new Error(
        `AI pricing request limit reached. Please try again in ${retryMinutes} minute(s).`
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY is not configured. Set it in your Convex environment."
      );
    }

    const referenceNow = Date.now();

    if (args.context.productId) {
      const cached: ProductPricingResult | null = await ctx.runQuery(
        internal.productPricingRecommendations.getCachedRecommendation,
        {
          productId: args.context.productId,
          currentPrice: args.context.price,
          stock: args.context.stock,
          referenceNow,
          cacheTtlMs: CACHE_TTL_MS,
        }
      );
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    const signals = await ctx.runQuery(
      internal.productPricingQueries.getProductPricingSignals,
      {
        productId: args.context.productId,
        categoryId: args.context.categoryId,
        referenceNow,
      }
    );

    const result = await generateProductPricingRecommendation(
      args.context,
      signals
    );

    const recommendationId: Id<"aiPricingRecommendations"> = await ctx.runMutation(
      internal.productPricingRecommendations.storeRecommendation,
      {
        productId: args.context.productId,
        adminUserId: session.adminUserId,
        productName: args.context.name,
        currentPrice: args.context.price,
        suggestedPrice: result.suggestedPrice,
        minRecommendedPrice: result.minRecommendedPrice,
        maxRecommendedPrice: result.maxRecommendedPrice,
        confidence: result.confidence,
        healthStatus: result.healthStatus,
        reasoning: result.reasoning,
        currency: args.context.currency,
        source: "product_form" as const,
        createdAt: referenceNow,
      }
    );

    return {
      recommendationId,
      currentPrice: args.context.price,
      suggestedPrice: result.suggestedPrice,
      minRecommendedPrice: result.minRecommendedPrice,
      maxRecommendedPrice: result.maxRecommendedPrice,
      confidence: result.confidence,
      healthStatus: result.healthStatus,
      reasoning: result.reasoning,
      currency: args.context.currency,
      similarProductPrices: result.similarProductPrices,
      cached: false,
    };
  },
});

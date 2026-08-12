import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Infer } from "convex/values";
import {
  recommendationResultValidator,
  recommendationSectionTypeValidator,
  recommendationSourceValidator,
} from "./lib/recommendations/validators";

type RecommendationSource = Infer<typeof recommendationSourceValidator>;

export const getRecommendations = action({
  args: {
    sectionType: recommendationSectionTypeValidator,
    visitorId: v.string(),
    customerEmail: v.optional(v.string()),
    productId: v.optional(v.id("products")),
    cartProductIds: v.optional(v.array(v.id("products"))),
    recentlyViewedProductIds: v.optional(v.array(v.id("products"))),
    limit: v.optional(v.number()),
  },
  returns: recommendationResultValidator,
  handler: async (ctx, args): Promise<Infer<typeof recommendationResultValidator>> => {
    const result = await ctx.runAction(
      internal.recommendationActions.computeSectionRecommendations,
      {
        sectionType: args.sectionType,
        visitorId: args.visitorId,
        customerEmail: args.customerEmail,
        productId: args.productId,
        cartProductIds: args.cartProductIds,
        recentlyViewedProductIds: args.recentlyViewedProductIds,
        limit: args.limit,
        writeCache: true,
      }
    );

    return {
      products: result.productIds.map((productId, index) => ({
        productId,
        score: result.scores[index] ?? 0,
      })),
      sectionType: args.sectionType,
      source: result.source as RecommendationSource,
      cacheKey: result.cacheKey,
      cached: Boolean(result.cacheKey),
    };
  },
});

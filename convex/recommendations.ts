import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Infer } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  recommendationResultValidator,
  recommendationSectionTypeValidator,
  recommendationSourceValidator,
} from "./lib/recommendations/validators";
import { sectionUsesContentModel } from "./lib/recommendations/mlStrategy";

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
    if (args.productId && sectionUsesContentModel(args.sectionType, args.productId)) {
      const resolved = await ctx.runQuery(internal.contentRecommendations.resolveForProduct, {
        productId: args.productId,
        limit: args.limit,
      });
      if (resolved.applied) {
        return {
          products: resolved.products,
          sectionType: args.sectionType,
          source: "similar",
          cached: false,
        };
      }
    }

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
      products: result.productIds.map((productId: Id<"products">, index: number) => ({
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

"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getReviewAIProvider } from "./lib/ai/getProvider";
import type { Id } from "./_generated/dataModel";

const publicReviewValidator = v.object({
  _id: v.id("productReviews"),
  productId: v.id("products"),
  orderId: v.id("orders"),
  customerName: v.string(),
  rating: v.number(),
  title: v.string(),
  content: v.string(),
  imageUrls: v.array(v.string()),
  isVerifiedPurchase: v.boolean(),
  isApproved: v.boolean(),
  helpfulCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
  aiTags: v.optional(v.array(v.string())),
  adminReplyPublished: v.optional(v.string()),
});

type PublicReviewResult = {
  _id: Id<"productReviews">;
  productId: Id<"products">;
  orderId: Id<"orders">;
  customerName: string;
  rating: number;
  title: string;
  content: string;
  imageUrls: string[];
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  helpfulCount: number;
  createdAt: number;
  updatedAt: number;
  aiTags?: string[];
  adminReplyPublished?: string;
};

export const searchReviewsSemantic = action({
  args: {
    productId: v.id("products"),
    queryText: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(publicReviewValidator),
  handler: async (ctx, args): Promise<PublicReviewResult[]> => {
    const queryText = args.queryText.trim();
    if (!queryText) return [];

    const limit = Math.min(args.limit ?? 20, 50);

    let embedding: number[];
    try {
      const provider = getReviewAIProvider();
      embedding = await provider.embed(queryText);
    } catch {
      return [];
    }

    const results = await ctx.vectorSearch("productReviews", "by_embedding", {
      vector: embedding,
      limit: limit * 2,
      filter: (q) => q.eq("productId", args.productId),
    });

    const reviews: PublicReviewResult[] = [];
    for (const hit of results) {
      if (reviews.length >= limit) break;
      const review = await ctx.runQuery(
        internal.reviewAiQueries.getPublicReviewById,
        { reviewId: hit._id as Id<"productReviews"> }
      );
      if (review) reviews.push(review);
    }

    return reviews;
  },
});

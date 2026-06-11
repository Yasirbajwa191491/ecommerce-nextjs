import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import {
  getApprovedReviewsForProduct,
  resolveReviewImageUrls,
  toPublicReview,
} from "./lib/reviews";

export const getReviewForAi = internalQuery({
  args: { reviewId: v.id("productReviews") },
  returns: v.union(
    v.object({
      productId: v.id("products"),
      title: v.string(),
      content: v.string(),
      rating: v.number(),
      customerName: v.string(),
      isApproved: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review) return null;

    return {
      productId: review.productId,
      title: review.title,
      content: review.content,
      rating: review.rating,
      customerName: review.customerName,
      isApproved: review.isApproved,
    };
  },
});

export const getPublicReviewById = internalQuery({
  args: { reviewId: v.id("productReviews") },
  returns: v.union(
    v.object({
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
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review || !review.isApproved) return null;

    return toPublicReview(
      review,
      await resolveReviewImageUrls(ctx, review.imageStorageIds)
    );
  },
});

export const getApprovedReviewTexts = internalQuery({
  args: { productId: v.id("products") },
  returns: v.object({
    texts: v.array(v.string()),
    previousReviewCount: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const approved = await getApprovedReviewsForProduct(ctx, args.productId);
    const texts = approved.map((r) => `${r.title}. ${r.content}`);

    const insights = await ctx.db
      .query("productReviewInsights")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .unique();

    return {
      texts,
      previousReviewCount: insights?.reviewCountAtGeneration,
    };
  },
});

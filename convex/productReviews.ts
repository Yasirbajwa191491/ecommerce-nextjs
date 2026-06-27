import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { clearTagIndexForReview } from "./lib/ai/tagIndex";
import { slugifyTag } from "./lib/ai/tagUtils";
import { paginateArray } from "./lib/pagination";
import { normalizeEmail } from "./lib/publicOrderDto";
import {
  buildTrackingBucketKey,
  checkAndIncrementRateLimit,
} from "./lib/rateLimit";
import {
  assertReviewEligibility,
  calculateAverageRating,
  calculateRatingDistribution,
  getApprovedReviewsForProduct,
  getReviewByOrderProduct,
  MAX_REVIEW_IMAGES,
  resolveReviewImageUrls,
  sortReviews,
  toPublicReview,
  validateRating,
  validateReviewContent,
  validateReviewTitle,
} from "./lib/reviews";
import {
  buildAnalyzeReviewIdempotencyKey,
  enqueueReviewAiJob,
} from "./lib/reviewAiQueue";

const reviewSortValidator = v.union(
  v.literal("recent"),
  v.literal("highest"),
  v.literal("lowest"),
  v.literal("helpful")
);

const ratingFilterValidator = v.optional(
  v.union(
    v.literal(1),
    v.literal(2),
    v.literal(3),
    v.literal(4),
    v.literal(5)
  )
);

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

async function lookupOrderByNumber(
  ctx: Parameters<typeof assertReviewEligibility>[0],
  orderNumber: string
) {
  const normalized = orderNumber.trim();
  const order = await ctx.db
    .query("orders")
    .withIndex("by_order_number", (q) => q.eq("orderNumber", normalized))
    .unique();
  if (!order) {
    throw new ConvexError("Order not found");
  }
  return order;
}

/** Latest approved reviews across the store for homepage testimonials. */
export const listHomepageTestimonials = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(publicReviewValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 8, 1), 20);
    const reviews = await ctx.db
      .query("productReviews")
      .withIndex("by_approval_created", (q) => q.eq("isApproved", true))
      .order("desc")
      .take(limit);

    return await Promise.all(
      reviews.map(async (review) =>
        toPublicReview(
          review,
          await resolveReviewImageUrls(ctx, review.imageStorageIds)
        )
      )
    );
  },
});

export const getProductReviewSummary = query({
  args: { productId: v.id("products") },
  returns: v.object({
    averageRating: v.number(),
    totalReviews: v.number(),
    distribution: v.array(
      v.object({
        stars: v.union(
          v.literal(1),
          v.literal(2),
          v.literal(3),
          v.literal(4),
          v.literal(5)
        ),
        count: v.number(),
        percent: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const approved = await getApprovedReviewsForProduct(ctx, args.productId);
    return {
      averageRating: calculateAverageRating(approved),
      totalReviews: approved.length,
      distribution: calculateRatingDistribution(approved),
    };
  },
});

export const getReviewById = query({
  args: { reviewId: v.id("productReviews") },
  returns: v.union(publicReviewValidator, v.null()),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review || !review.isApproved) return null;

    return toPublicReview(
      review,
      await resolveReviewImageUrls(ctx, review.imageStorageIds)
    );
  },
});

export const listProductReviews = query({
  args: {
    productId: v.id("products"),
    sort: v.optional(reviewSortValidator),
    ratingFilter: ratingFilterValidator,
    tagFilter: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(publicReviewValidator),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    let reviews = await getApprovedReviewsForProduct(ctx, args.productId);

    if (args.ratingFilter !== undefined) {
      reviews = reviews.filter((r) => r.rating === args.ratingFilter);
    }

    if (args.tagFilter) {
      const tagSlug = slugifyTag(args.tagFilter);
      const taggedReviewIds = new Set(
        (
          await ctx.db
            .query("reviewTagIndex")
            .withIndex("by_product_tag", (q) =>
              q
                .eq("productId", args.productId)
                .eq("tagSlug", tagSlug)
                .eq("isApproved", true)
            )
            .collect()
        ).map((row) => row.reviewId)
      );
      reviews = reviews.filter((r) => taggedReviewIds.has(r._id));
    }

    reviews = sortReviews(reviews, args.sort ?? "recent");

    const { page, isDone, continueCursor } = paginateArray(
      reviews,
      args.paginationOpts
    );

    const enriched = await Promise.all(
      page.map(async (review) =>
        toPublicReview(
          review,
          await resolveReviewImageUrls(ctx, review.imageStorageIds)
        )
      )
    );

    return { page: enriched, isDone, continueCursor };
  },
});

export const checkReviewEligibility = query({
  args: {
    orderNumber: v.string(),
    customerEmail: v.string(),
    productId: v.id("products"),
  },
  returns: v.object({
    eligible: v.boolean(),
    reason: v.optional(v.string()),
    hasExistingReview: v.boolean(),
  }),
  handler: async (ctx, args) => {
    try {
      const order = await lookupOrderByNumber(ctx, args.orderNumber);
      const existing = await getReviewByOrderProduct(
        ctx,
        order._id,
        args.productId
      );
      if (existing) {
        return {
          eligible: false,
          reason: "You have already reviewed this product for this order",
          hasExistingReview: true,
        };
      }
      await assertReviewEligibility(ctx, {
        orderId: order._id,
        productId: args.productId,
        customerEmail: args.customerEmail,
        allowExisting: true,
      });
      return { eligible: true, hasExistingReview: false };
    } catch (error) {
      return {
        eligible: false,
        reason:
          error instanceof ConvexError
            ? error.message
            : "Not eligible to review",
        hasExistingReview: false,
      };
    }
  },
});

export const getOrderReviewStatus = query({
  args: {
    orderNumber: v.string(),
    customerEmail: v.string(),
  },
  returns: v.array(
    v.object({
      productId: v.id("products"),
      productName: v.string(),
      status: v.union(
        v.literal("not_eligible"),
        v.literal("eligible"),
        v.literal("pending"),
        v.literal("approved")
      ),
      reviewId: v.optional(v.id("productReviews")),
    })
  ),
  handler: async (ctx, args) => {
    const order = await lookupOrderByNumber(ctx, args.orderNumber);
    if (
      normalizeEmail(order.customerEmail) !==
      normalizeEmail(args.customerEmail)
    ) {
      throw new ConvexError("Customer email does not match this order");
    }

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
      .collect();

    const isDelivered = order.status === "delivered";
    const results = [];

    for (const item of items) {
      const review = await getReviewByOrderProduct(
        ctx,
        order._id,
        item.productId
      );

      let status: "not_eligible" | "eligible" | "pending" | "approved" =
        "not_eligible";
      if (review) {
        status = review.isApproved ? "approved" : "pending";
      } else if (isDelivered) {
        status = "eligible";
      }

      results.push({
        productId: item.productId,
        productName: item.productName,
        status,
        reviewId: review?._id,
      });
    }

    return results;
  },
});

export const getCustomerReviewsForOrder = query({
  args: {
    orderNumber: v.string(),
    customerEmail: v.string(),
  },
  returns: v.array(
    v.object({
      review: publicReviewValidator,
      productName: v.string(),
      imageStorageIds: v.array(v.id("_storage")),
    })
  ),
  handler: async (ctx, args) => {
    const order = await lookupOrderByNumber(ctx, args.orderNumber);
    if (
      normalizeEmail(order.customerEmail) !==
      normalizeEmail(args.customerEmail)
    ) {
      throw new ConvexError("Customer email does not match this order");
    }

    const reviews = await ctx.db
      .query("productReviews")
      .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
      .collect();

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
      .collect();
    const nameByProduct = new Map(
      items.map((item) => [item.productId, item.productName])
    );

    return await Promise.all(
      reviews.map(async (review) => ({
        review: toPublicReview(
          review,
          await resolveReviewImageUrls(ctx, review.imageStorageIds)
        ),
        productName:
          nameByProduct.get(review.productId) ?? "Product",
        imageStorageIds: review.imageStorageIds ?? [],
      }))
    );
  },
});

export const createReview = mutation({
  args: {
    orderNumber: v.string(),
    customerEmail: v.string(),
    productId: v.id("products"),
    rating: v.number(),
    title: v.string(),
    content: v.string(),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.id("productReviews"),
  handler: async (ctx, args) => {
    const rateLimit = await checkAndIncrementRateLimit(
      ctx,
      buildTrackingBucketKey(
        "review-create",
        normalizeEmail(args.customerEmail)
      ),
      { maxAttempts: 5, windowMs: 60 * 60 * 1000 }
    );
    if (!rateLimit.allowed) {
      throw new ConvexError(
        "Too many review submissions. Please try again later."
      );
    }

    const order = await lookupOrderByNumber(ctx, args.orderNumber);
    await assertReviewEligibility(ctx, {
      orderId: order._id,
      productId: args.productId,
      customerEmail: args.customerEmail,
    });

    const rating = validateRating(args.rating);
    const title = validateReviewTitle(args.title);
    const content = validateReviewContent(args.content);

    const imageStorageIds = args.imageStorageIds ?? [];
    if (imageStorageIds.length > MAX_REVIEW_IMAGES) {
      throw new ConvexError(`Maximum ${MAX_REVIEW_IMAGES} images allowed`);
    }

    const now = Date.now();
    const reviewId = await ctx.db.insert("productReviews", {
      productId: args.productId,
      orderId: order._id,
      customerName: order.customerName,
      customerEmail: normalizeEmail(args.customerEmail),
      customerUserId: order.userId,
      rating,
      title,
      content,
      imageStorageIds: imageStorageIds.length ? imageStorageIds : undefined,
      isVerifiedPurchase: true,
      isApproved: false,
      helpfulCount: 0,
      source: "web",
      createdAt: now,
      updatedAt: now,
      aiAnalysisStatus: "pending",
    });

    await enqueueReviewAiJob(ctx, {
      jobType: "analyze_review",
      reviewId,
      idempotencyKey: buildAnalyzeReviewIdempotencyKey(reviewId, title, content),
    });

    await ctx.scheduler.runAfter(0, internal.n8nWebhooks.emitReviewEvent, {
      event: "review.created",
      payload: JSON.stringify({ reviewId, productId: args.productId }),
    });

    return reviewId;
  },
});

export const updateReview = mutation({
  args: {
    reviewId: v.id("productReviews"),
    orderNumber: v.string(),
    customerEmail: v.string(),
    rating: v.number(),
    title: v.string(),
    content: v.string(),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.id("productReviews"),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new ConvexError("Review not found");
    if (review.isApproved) {
      throw new ConvexError("Approved reviews cannot be edited");
    }

    const order = await lookupOrderByNumber(ctx, args.orderNumber);
    if (review.orderId !== order._id) {
      throw new ConvexError("Review does not belong to this order");
    }
    if (
      normalizeEmail(review.customerEmail) !==
      normalizeEmail(args.customerEmail)
    ) {
      throw new ConvexError("Unauthorized");
    }

    const rating = validateRating(args.rating);
    const title = validateReviewTitle(args.title);
    const content = validateReviewContent(args.content);

    const imageStorageIds = args.imageStorageIds ?? [];
    if (imageStorageIds.length > MAX_REVIEW_IMAGES) {
      throw new ConvexError(`Maximum ${MAX_REVIEW_IMAGES} images allowed`);
    }

    await ctx.db.patch(args.reviewId, {
      rating,
      title,
      content,
      imageStorageIds: imageStorageIds.length ? imageStorageIds : undefined,
      updatedAt: Date.now(),
      aiAnalysisStatus: "pending",
      aiSentiment: undefined,
      aiSentimentConfidence: undefined,
      aiTags: undefined,
      aiModeration: undefined,
      embedding: undefined,
      aiAnalyzedAt: undefined,
      aiError: undefined,
    });

    const tagRows = await ctx.db
      .query("reviewTagIndex")
      .filter((q) => q.eq(q.field("reviewId"), args.reviewId))
      .collect();
    for (const row of tagRows) {
      await ctx.db.delete(row._id);
    }

    await enqueueReviewAiJob(ctx, {
      jobType: "analyze_review",
      reviewId: args.reviewId,
      idempotencyKey: buildAnalyzeReviewIdempotencyKey(
        args.reviewId,
        title,
        content
      ),
    });

    await ctx.scheduler.runAfter(0, internal.n8nWebhooks.emitReviewEvent, {
      event: "review.updated",
      payload: JSON.stringify({
        reviewId: args.reviewId,
        productId: review.productId,
      }),
    });

    return args.reviewId;
  },
});

export const deleteReview = mutation({
  args: {
    reviewId: v.id("productReviews"),
    orderNumber: v.string(),
    customerEmail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new ConvexError("Review not found");
    if (review.isApproved) {
      throw new ConvexError("Approved reviews cannot be deleted");
    }

    const order = await lookupOrderByNumber(ctx, args.orderNumber);
    if (review.orderId !== order._id) {
      throw new ConvexError("Review does not belong to this order");
    }
    if (
      normalizeEmail(review.customerEmail) !==
      normalizeEmail(args.customerEmail)
    ) {
      throw new ConvexError("Unauthorized");
    }

    const votes = await ctx.db
      .query("reviewHelpfulVotes")
      .withIndex("by_review_voter", (q) => q.eq("reviewId", args.reviewId))
      .collect();
    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    await clearTagIndexForReview(ctx, args.reviewId);
    await ctx.db.delete(args.reviewId);
    return null;
  },
});

export const markReviewHelpful = mutation({
  args: {
    reviewId: v.id("productReviews"),
    voterKey: v.string(),
  },
  returns: v.object({ helpfulCount: v.number() }),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review || !review.isApproved) {
      throw new ConvexError("Review not found");
    }

    const voterKey = args.voterKey.trim().toLowerCase();
    if (!voterKey) {
      throw new ConvexError("Voter identity is required");
    }

    const rateLimit = await checkAndIncrementRateLimit(
      ctx,
      buildTrackingBucketKey("review-helpful", voterKey),
      { maxAttempts: 30, windowMs: 60 * 60 * 1000 }
    );
    if (!rateLimit.allowed) {
      throw new ConvexError("Too many votes. Please try again later.");
    }

    const existing = await ctx.db
      .query("reviewHelpfulVotes")
      .withIndex("by_review_voter", (q) =>
        q.eq("reviewId", args.reviewId).eq("voterKey", voterKey)
      )
      .unique();

    if (existing) {
      return { helpfulCount: review.helpfulCount };
    }

    await ctx.db.insert("reviewHelpfulVotes", {
      reviewId: args.reviewId,
      voterKey,
      createdAt: Date.now(),
    });

    const helpfulCount = review.helpfulCount + 1;
    await ctx.db.patch(args.reviewId, { helpfulCount });

    return { helpfulCount };
  },
});

export const generateReviewImageUploadUrl = mutation({
  args: {
    orderNumber: v.string(),
    customerEmail: v.string(),
    productId: v.id("products"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const order = await lookupOrderByNumber(ctx, args.orderNumber);
    await assertReviewEligibility(ctx, {
      orderId: order._id,
      productId: args.productId,
      customerEmail: args.customerEmail,
      allowExisting: true,
    });
    return await ctx.storage.generateUploadUrl();
  },
});

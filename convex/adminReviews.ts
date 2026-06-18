import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { getPrimaryImageUrl } from "./lib/productImages";
import { requireAdmin } from "./lib/requireAdmin";
import { paginateArray } from "./lib/pagination";
import {
  clearTagIndexForReview,
  syncTagIndexApproval,
  syncTagIndexForReview,
} from "./lib/ai/tagIndex";
import {
  resolveReviewImageUrls,
  syncProductReviewStats,
} from "./lib/reviews";

const reviewStatusFilterValidator = v.optional(
  v.union(v.literal("all"), v.literal("pending"), v.literal("approved"))
);

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: reviewStatusFilterValidator,
    rating: v.optional(v.number()),
    search: v.optional(v.string()),
    productId: v.optional(v.id("products")),
    flaggedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let reviews = await ctx.db.query("productReviews").collect();

    if (args.status === "pending") {
      reviews = reviews.filter((r) => !r.isApproved);
    } else if (args.status === "approved") {
      reviews = reviews.filter((r) => r.isApproved);
    }

    if (args.rating !== undefined) {
      reviews = reviews.filter((r) => r.rating === args.rating);
    }

    if (args.productId) {
      reviews = reviews.filter((r) => r.productId === args.productId);
    }

    if (args.search?.trim()) {
      const term = args.search.trim().toLowerCase();
      reviews = reviews.filter(
        (r) =>
          r.title.toLowerCase().includes(term) ||
          r.customerName.toLowerCase().includes(term) ||
          r.customerEmail.toLowerCase().includes(term) ||
          r.content.toLowerCase().includes(term)
      );
    }

    if (args.flaggedOnly) {
      reviews = reviews.filter((r) => r.aiModeration?.flagged === true);
    }

    reviews.sort((a, b) => b.createdAt - a.createdAt);

    const { page, isDone, continueCursor } = paginateArray(
      reviews,
      args.paginationOpts
    );

    const enriched = await Promise.all(
      page.map(async (review) => {
        const product = await ctx.db.get(review.productId);
        const order = await ctx.db.get(review.orderId);
        return {
          ...review,
          productName: product?.name ?? "Unknown product",
          orderNumber: order?.orderNumber ?? "—",
        };
      })
    );

    return { page: enriched, isDone, continueCursor };
  },
});

export const countPending = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const pending = await ctx.db
      .query("productReviews")
      .withIndex("by_approval_created", (q) => q.eq("isApproved", false))
      .collect();
    return pending.length;
  },
});

export const getById = query({
  args: { id: v.id("productReviews") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const review = await ctx.db.get(args.id);
    if (!review) return null;

    const [product, order, imageUrls] = await Promise.all([
      ctx.db.get(review.productId),
      ctx.db.get(review.orderId),
      resolveReviewImageUrls(ctx, review.imageStorageIds),
    ]);

    const orderItems = order
      ? await ctx.db
          .query("orderItems")
          .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
          .collect()
      : [];

    const matchingItem = orderItems.find(
      (item) => item.productId === review.productId
    );

    return {
      review,
      imageUrls,
      product: product
        ? {
            _id: product._id,
            name: product.name,
            company: product.company,
            imageUrl: getPrimaryImageUrl(product),
          }
        : null,
      order: order
        ? {
            _id: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            createdAt: order.createdAt,
          }
        : null,
      purchaseVerification: {
        isVerifiedPurchase: review.isVerifiedPurchase,
        productInOrder: Boolean(matchingItem),
        orderDelivered: order?.status === "delivered",
      },
    };
  },
});

export const approve = mutation({
  args: { id: v.id("productReviews") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const review = await ctx.db.get(args.id);
    if (!review) throw new ConvexError("Review not found");

    await ctx.db.patch(args.id, {
      isApproved: true,
      updatedAt: Date.now(),
    });

    if (review.aiTags?.length) {
      await syncTagIndexForReview(ctx, {
        reviewId: args.id,
        productId: review.productId,
        isApproved: true,
        tags: review.aiTags,
      });
    } else {
      await syncTagIndexApproval(ctx, args.id, true);
    }

    await syncProductReviewStats(ctx, review.productId);

    await ctx.scheduler.runAfter(
      0,
      internal.reviewAiActions.regenerateProductInsights,
      { productId: review.productId, force: false }
    );

    return { success: true as const };
  },
});

export const reject = mutation({
  args: { id: v.id("productReviews") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const review = await ctx.db.get(args.id);
    if (!review) throw new ConvexError("Review not found");

    const wasApproved = review.isApproved;
    await ctx.db.patch(args.id, {
      isApproved: false,
      updatedAt: Date.now(),
    });

    await syncTagIndexApproval(ctx, args.id, false);

    if (wasApproved) {
      await syncProductReviewStats(ctx, review.productId);
      await ctx.scheduler.runAfter(
        0,
        internal.reviewAiActions.regenerateProductInsights,
        { productId: review.productId, force: false }
      );
    }

    return { success: true as const };
  },
});

export const remove = mutation({
  args: { id: v.id("productReviews") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const review = await ctx.db.get(args.id);
    if (!review) throw new ConvexError("Review not found");

    const wasApproved = review.isApproved;
    const productId = review.productId;

    const votes = await ctx.db
      .query("reviewHelpfulVotes")
      .withIndex("by_review_voter", (q) => q.eq("reviewId", args.id))
      .collect();
    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    await clearTagIndexForReview(ctx, args.id);
    await ctx.db.delete(args.id);

    if (wasApproved) {
      await syncProductReviewStats(ctx, productId);
      await ctx.scheduler.runAfter(
        0,
        internal.reviewAiActions.regenerateProductInsights,
        { productId, force: false }
      );
    }

    return { success: true as const };
  },
});

export const retryAiAnalysis = mutation({
  args: { id: v.id("productReviews") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const review = await ctx.db.get(args.id);
    if (!review) throw new ConvexError("Review not found");

    await ctx.db.patch(args.id, {
      aiAnalysisStatus: "pending",
      aiError: undefined,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.reviewAiActions.processReview, {
      reviewId: args.id,
    });

    return null;
  },
});

export const generateReplyDraft = mutation({
  args: { id: v.id("productReviews") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const review = await ctx.db.get(args.id);
    if (!review) throw new ConvexError("Review not found");

    await ctx.scheduler.runAfter(0, internal.reviewAiActions.generateReply, {
      reviewId: args.id,
    });

    return null;
  },
});

export const publishReply = mutation({
  args: {
    id: v.id("productReviews"),
    reply: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const review = await ctx.db.get(args.id);
    if (!review) throw new ConvexError("Review not found");

    const reply = args.reply.trim();
    if (!reply) throw new ConvexError("Reply cannot be empty");

    await ctx.db.patch(args.id, {
      adminReplyPublished: reply,
      adminReplyPublishedAt: Date.now(),
      adminReplyDraft: reply,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const clearReplyDraft = mutation({
  args: { id: v.id("productReviews") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const review = await ctx.db.get(args.id);
    if (!review) throw new ConvexError("Review not found");

    await ctx.db.patch(args.id, {
      adminReplyDraft: undefined,
      updatedAt: Date.now(),
    });

    return null;
  },
});

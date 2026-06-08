import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./lib/requireAdmin";
import { paginateArray } from "./lib/pagination";
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
            imageUrl: product.image[0]?.url ?? "",
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

    await syncProductReviewStats(ctx, review.productId);
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

    if (wasApproved) {
      await syncProductReviewStats(ctx, review.productId);
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

    await ctx.db.delete(args.id);

    if (wasApproved) {
      await syncProductReviewStats(ctx, productId);
    }

    return { success: true as const };
  },
});

import { internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v, ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { isProductActive } from "../lib/productActive";
import { normalizeEmail } from "../lib/publicOrderDto";
import {
  assertReviewEligibility,
  getReviewByOrderProduct,
  REVIEW_CONTENT_MIN,
  REVIEW_TITLE_MIN,
  REVIEW_TITLE_MAX,
  sanitizeReviewText,
  validateRating,
  validateReviewContent,
  validateReviewTitle,
} from "../lib/reviews";

function titleFromReviewContent(content: string): string {
  const sanitized = sanitizeReviewText(content);
  const firstSentence =
    sanitized.split(/[.!?]/)[0]?.trim() ?? sanitized;
  if (firstSentence.length >= REVIEW_TITLE_MIN) {
    return firstSentence.slice(0, REVIEW_TITLE_MAX);
  }
  if (sanitized.length >= REVIEW_TITLE_MIN) {
    return sanitized.slice(0, REVIEW_TITLE_MAX);
  }
  return "Phone review";
}

function normalizeVoiceReviewContent(raw: string): string {
  const sanitized = sanitizeReviewText(raw);
  if (sanitized.length >= REVIEW_CONTENT_MIN) {
    return sanitized;
  }
  const padded = `${sanitized}. Feedback shared during a phone review call.`;
  return validateReviewContent(padded);
}

async function loadReviewCallForTool(
  ctx: QueryCtx | MutationCtx,
  reviewCallId: Id<"review_calls">
) {
  const call = await ctx.db.get(reviewCallId);
  if (!call) {
    throw new ConvexError("Review call not found");
  }
  if (call.status !== "calling") {
    throw new ConvexError("Review call is not active");
  }
  return call;
}

async function parseCallMetadata(call: { metadata?: string; orderId: Id<"orders"> }) {
  let orderId = call.orderId;
  let customerEmail = "";
  let productIds: Id<"products">[] = [];

  if (call.metadata) {
    try {
      const parsed = JSON.parse(call.metadata) as {
        orderId?: string;
        customerEmail?: string;
        productIds?: string[];
      };
      if (parsed.orderId) orderId = parsed.orderId as Id<"orders">;
      customerEmail = parsed.customerEmail ?? "";
      productIds = (parsed.productIds ?? []) as Id<"products">[];
    } catch {
      // use defaults
    }
  }

  return { orderId, customerEmail, productIds };
}

export const getOrderProductsForReview = internalQuery({
  args: {
    reviewCallId: v.string(),
    orderId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    products: v.array(
      v.object({
        productId: v.string(),
        productName: v.string(),
        alreadyReviewed: v.boolean(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    try {
      const reviewCallId = args.reviewCallId as Id<"review_calls">;
      const call = await loadReviewCallForTool(ctx, reviewCallId);
      const meta = await parseCallMetadata(call);

      if (meta.orderId !== (args.orderId as Id<"orders">)) {
        return {
          success: false,
          message: "Order ID does not match this call.",
          products: [],
        };
      }

      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order_id", (q) => q.eq("orderId", meta.orderId))
        .collect();

      const products = await Promise.all(
        items.map(async (item) => {
          const product = await ctx.db.get(item.productId);
          const existing = await getReviewByOrderProduct(
            ctx,
            meta.orderId,
            item.productId
          );
          return {
            productId: item.productId,
            productName: product?.name ?? "Product",
            alreadyReviewed: existing !== null,
          };
        })
      );

      const pending = products.filter((p) => !p.alreadyReviewed);

      return {
        success: true,
        message:
          pending.length === 0
            ? "All products in this order already have reviews."
            : `${pending.length} product(s) ready for review.`,
        products: pending.map((p) => ({
          productId: p.productId,
          productName: p.productName,
          alreadyReviewed: p.alreadyReviewed,
        })),
      };
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? (typeof error.data === "string" ? error.data : error.message)
          : error instanceof Error
            ? error.message
            : "Unable to load products.";
      return { success: false, message, products: [] };
    }
  },
});

export const createProductReview = internalMutation({
  args: {
    reviewCallId: v.string(),
    orderId: v.string(),
    productId: v.string(),
    rating: v.number(),
    review: v.string(),
    recommendationScore: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    reviewId: v.optional(v.id("productReviews")),
  }),
  handler: async (ctx, args) => {
    try {
      const reviewCallId = args.reviewCallId as Id<"review_calls">;
      const orderId = args.orderId as Id<"orders">;
      const productId = args.productId as Id<"products">;

      const call = await loadReviewCallForTool(ctx, reviewCallId);
      if (call.orderId !== orderId) {
        return {
          success: false,
          message: "Order ID does not match this call.",
        };
      }

      const order = await ctx.db.get(orderId);
      if (!order) {
        return { success: false, message: "Order not found." };
      }

      const product = await ctx.db.get(productId);
      if (!product || !isProductActive(product)) {
        return { success: false, message: "Product not found." };
      }

      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order_id", (q) => q.eq("orderId", orderId))
        .collect();

      if (!items.some((item) => item.productId === productId)) {
        return {
          success: false,
          message: "Product is not part of this order.",
        };
      }

      await assertReviewEligibility(ctx, {
        orderId,
        productId,
        customerEmail: order.customerEmail,
      });

      const rating = validateRating(args.rating);
      const content = normalizeVoiceReviewContent(args.review);
      const title = validateReviewTitle(titleFromReviewContent(content));

      let recommendationScore: number | undefined;
      if (args.recommendationScore !== undefined) {
        const score = Math.round(args.recommendationScore);
        if (score < 0 || score > 10) {
          return {
            success: false,
            message: "Recommendation score must be between 0 and 10.",
          };
        }
        recommendationScore = score;
      }

      const now = Date.now();
      const reviewId = await ctx.db.insert("productReviews", {
        productId,
        orderId,
        customerName: order.customerName,
        customerEmail: normalizeEmail(order.customerEmail),
        customerUserId: order.userId,
        rating,
        title,
        content,
        isVerifiedPurchase: true,
        isApproved: false,
        helpfulCount: 0,
        source: "vapi",
        recommendationScore,
        createdAt: now,
        updatedAt: now,
        aiAnalysisStatus: "pending",
      });

      await ctx.scheduler.runAfter(0, internal.reviewAiActions.processReview, {
        reviewId,
      });

      const collectedEntry = {
        productId,
        reviewId,
        rating,
        recommendationScore,
      };

      await ctx.db.patch(reviewCallId, {
        reviewsCollected: [...call.reviewsCollected, collectedEntry],
      });

      return {
        success: true,
        message: `Thank you! Your review for ${product.name} has been saved.`,
        reviewId,
      };
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? (typeof error.data === "string" ? error.data : error.message)
          : error instanceof Error
            ? error.message
            : "Unable to save review.";
      return { success: false, message };
    }
  },
});

export const resolveReviewCallByVapiId = internalQuery({
  args: { vapiCallId: v.string() },
  returns: v.union(v.id("review_calls"), v.null()),
  handler: async (ctx, args) => {
    const call = await ctx.db
      .query("review_calls")
      .withIndex("by_vapi_call_id", (q) => q.eq("vapiCallId", args.vapiCallId))
      .unique();
    return call?._id ?? null;
  },
});

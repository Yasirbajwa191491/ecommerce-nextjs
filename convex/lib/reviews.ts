import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { normalizeEmail } from "./publicOrderDto";

export const REVIEW_TITLE_MIN = 3;
export const REVIEW_TITLE_MAX = 120;
export const REVIEW_CONTENT_MIN = 20;
export const REVIEW_CONTENT_MAX = 5000;
export const MAX_REVIEW_IMAGES = 5;

export type ReviewSort = "recent" | "highest" | "lowest" | "helpful";

export type RatingDistribution = {
  stars: 1 | 2 | 3 | 4 | 5;
  count: number;
  percent: number;
};

export function validateRating(rating: number): number {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ConvexError("Rating must be an integer between 1 and 5");
  }
  return rating;
}

export function sanitizeReviewText(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateReviewTitle(title: string): string {
  const sanitized = sanitizeReviewText(title);
  if (sanitized.length < REVIEW_TITLE_MIN) {
    throw new ConvexError(
      `Review title must be at least ${REVIEW_TITLE_MIN} characters`
    );
  }
  if (sanitized.length > REVIEW_TITLE_MAX) {
    throw new ConvexError(
      `Review title must be at most ${REVIEW_TITLE_MAX} characters`
    );
  }
  return sanitized;
}

export function validateReviewContent(content: string): string {
  const sanitized = sanitizeReviewText(content);
  if (sanitized.length < REVIEW_CONTENT_MIN) {
    throw new ConvexError(
      `Review content must be at least ${REVIEW_CONTENT_MIN} characters`
    );
  }
  if (sanitized.length > REVIEW_CONTENT_MAX) {
    throw new ConvexError(
      `Review content must be at most ${REVIEW_CONTENT_MAX} characters`
    );
  }
  return sanitized;
}

export function calculateAverageRating(
  reviews: Array<{ rating: number }>
): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

export function calculateRatingDistribution(
  reviews: Array<{ rating: number }>
): RatingDistribution[] {
  const total = reviews.length;
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const review of reviews) {
    const bucket = Math.min(5, Math.max(1, Math.round(review.rating)));
    counts[bucket] += 1;
  }
  return ([5, 4, 3, 2, 1] as const).map((stars) => ({
    stars,
    count: counts[stars],
    percent: total === 0 ? 0 : Math.round((counts[stars] / total) * 100),
  }));
}

export async function orderContainsProduct(
  ctx: QueryCtx | MutationCtx,
  orderId: Id<"orders">,
  productId: Id<"products">
): Promise<boolean> {
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_order_id", (q) => q.eq("orderId", orderId))
    .collect();
  return items.some((item) => item.productId === productId);
}

export async function getReviewByOrderProduct(
  ctx: QueryCtx | MutationCtx,
  orderId: Id<"orders">,
  productId: Id<"products">
): Promise<Doc<"productReviews"> | null> {
  return await ctx.db
    .query("productReviews")
    .withIndex("by_order_product", (q) =>
      q.eq("orderId", orderId).eq("productId", productId)
    )
    .unique();
}

export async function assertReviewEligibility(
  ctx: QueryCtx | MutationCtx,
  args: {
    orderId: Id<"orders">;
    productId: Id<"products">;
    customerEmail: string;
    allowExisting?: boolean;
  }
): Promise<Doc<"orders">> {
  const order = await ctx.db.get(args.orderId);
  if (!order) {
    throw new ConvexError("Order not found");
  }

  if (order.status !== "delivered") {
    throw new ConvexError(
      "Reviews can only be submitted for delivered orders"
    );
  }

  if (
    normalizeEmail(order.customerEmail) !== normalizeEmail(args.customerEmail)
  ) {
    throw new ConvexError("Customer email does not match this order");
  }

  const product = await ctx.db.get(args.productId);
  if (!product) {
    throw new ConvexError("Product not found");
  }

  const hasProduct = await orderContainsProduct(
    ctx,
    args.orderId,
    args.productId
  );
  if (!hasProduct) {
    throw new ConvexError("This product was not part of the order");
  }

  if (!args.allowExisting) {
    const existing = await getReviewByOrderProduct(
      ctx,
      args.orderId,
      args.productId
    );
    if (existing) {
      throw new ConvexError("A review already exists for this product in this order");
    }
  }

  return order;
}

export async function resolveReviewImageUrls(
  ctx: QueryCtx | MutationCtx,
  storageIds: Id<"_storage">[] | undefined
): Promise<string[]> {
  if (!storageIds?.length) return [];
  const urls: string[] = [];
  for (const storageId of storageIds) {
    const url = await ctx.storage.getUrl(storageId);
    if (url) urls.push(url);
  }
  return urls;
}

export async function getApprovedReviewsForProduct(
  ctx: QueryCtx | MutationCtx,
  productId: Id<"products">
): Promise<Doc<"productReviews">[]> {
  return await ctx.db
    .query("productReviews")
    .withIndex("by_product_approved_created", (q) =>
      q.eq("productId", productId).eq("isApproved", true)
    )
    .collect();
}

export async function syncProductReviewStats(
  ctx: MutationCtx,
  productId: Id<"products">
): Promise<void> {
  const approved = await getApprovedReviewsForProduct(ctx, productId);
  const stars = calculateAverageRating(approved);
  const reviews = approved.length;
  await ctx.db.patch(productId, { stars, reviews });
}

export function sortReviews(
  reviews: Doc<"productReviews">[],
  sort: ReviewSort
): Doc<"productReviews">[] {
  const sorted = [...reviews];
  switch (sort) {
    case "highest":
      sorted.sort((a, b) => b.rating - a.rating || b.createdAt - a.createdAt);
      break;
    case "lowest":
      sorted.sort((a, b) => a.rating - b.rating || b.createdAt - a.createdAt);
      break;
    case "helpful":
      sorted.sort(
        (a, b) => b.helpfulCount - a.helpfulCount || b.createdAt - a.createdAt
      );
      break;
    case "recent":
    default:
      sorted.sort((a, b) => b.createdAt - a.createdAt);
      break;
  }
  return sorted;
}

export function toPublicReview(
  review: Doc<"productReviews">,
  imageUrls: string[]
) {
  return {
    _id: review._id,
    productId: review.productId,
    orderId: review.orderId,
    customerName: review.customerName,
    rating: review.rating,
    title: review.title,
    content: review.content,
    imageUrls,
    isVerifiedPurchase: review.isVerifiedPurchase,
    isApproved: review.isApproved,
    helpfulCount: review.helpfulCount,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    aiTags:
      review.aiAnalysisStatus === "complete" ? review.aiTags : undefined,
    adminReplyPublished: review.adminReplyPublished,
  };
}

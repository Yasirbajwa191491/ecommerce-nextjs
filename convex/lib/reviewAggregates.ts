import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { calculateAverageRating } from "./reviews";

export type ReviewAnalytics = {
  totalReviews: number;
  averageStoreRating: number;
  pendingApproval: number;
  mostReviewedProducts: Array<{
    productId: Id<"products">;
    productName: string;
    reviewCount: number;
    averageRating: number;
  }>;
  highestRatedProducts: Array<{
    productId: Id<"products">;
    productName: string;
    reviewCount: number;
    averageRating: number;
  }>;
};

const MIN_REVIEWS_FOR_TOP_RATED = 3;
const TOP_PRODUCTS_LIMIT = 10;

export async function computeReviewAnalytics(
  ctx: QueryCtx
): Promise<ReviewAnalytics> {
  const allReviews = await ctx.db.query("productReviews").collect();
  const approved = allReviews.filter((r) => r.isApproved);
  const pending = allReviews.filter((r) => !r.isApproved);

  const byProduct = new Map<
    Id<"products">,
    { ratings: number[]; name?: string }
  >();

  for (const review of approved) {
    const entry = byProduct.get(review.productId) ?? { ratings: [] };
    entry.ratings.push(review.rating);
    byProduct.set(review.productId, entry);
  }

  const productStats: ReviewAnalytics["mostReviewedProducts"] = [];
  for (const [productId, data] of byProduct.entries()) {
    const product = await ctx.db.get(productId);
    if (!product) continue;
    productStats.push({
      productId,
      productName: product.name,
      reviewCount: data.ratings.length,
      averageRating: calculateAverageRating(
        data.ratings.map((rating) => ({ rating }))
      ),
    });
  }

  const mostReviewedProducts = [...productStats]
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, TOP_PRODUCTS_LIMIT);

  const highestRatedProducts = [...productStats]
    .filter((p) => p.reviewCount >= MIN_REVIEWS_FOR_TOP_RATED)
    .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount)
    .slice(0, TOP_PRODUCTS_LIMIT);

  return {
    totalReviews: approved.length,
    averageStoreRating: calculateAverageRating(approved),
    pendingApproval: pending.length,
    mostReviewedProducts,
    highestRatedProducts,
  };
}

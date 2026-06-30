import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { calculateFinalPrice } from "../pricing";
import { computeHybridScore } from "../search/hybridRank";
import { parseAffinityScores } from "./profileBuilder";
import type { ScoringWeights } from "./settings";

export type ScoredProduct = {
  productId: Id<"products">;
  score: number;
  customerInterestScore: number;
  productSimilarityScore: number;
  purchaseHistoryScore: number;
  popularityScore: number;
  aiAdjustmentScore: number;
  explanation?: string;
};

type CandidateProduct = {
  _id: Id<"products">;
  name: string;
  company: string;
  price: number;
  discountPercent: number;
  stars: number;
  reviews: number;
  featured: boolean;
  categoryId: Id<"productCategories">;
  categoryName: string;
  keywords: string[];
  popularityScore: number;
};

export function composeFinalScore(
  parts: {
    customerInterestScore: number;
    productSimilarityScore: number;
    purchaseHistoryScore: number;
    popularityScore: number;
    aiAdjustmentScore: number;
  },
  weights: ScoringWeights
): number {
  return (
    weights.customerInterest * parts.customerInterestScore +
    weights.productSimilarity * parts.productSimilarityScore +
    weights.purchaseHistory * parts.purchaseHistoryScore +
    weights.popularity * parts.popularityScore +
    weights.aiAdjustment * parts.aiAdjustmentScore
  );
}

export function scoreCustomerInterest(
  product: CandidateProduct,
  profile: Doc<"customerRecommendationProfiles"> | null
): number {
  if (!profile) return 0;

  const categoryAffinity = parseAffinityScores(profile.preferredCategoryIds);
  const brandAffinity = parseAffinityScores(profile.preferredBrands);

  const categoryScore = categoryAffinity[product.categoryId] ?? 0;
  const brandScore = brandAffinity[product.company.toLowerCase()] ?? 0;

  let priceScore = 0;
  if (
    profile.priceRangeMin !== undefined &&
    profile.priceRangeMax !== undefined
  ) {
    const finalPrice = calculateFinalPrice(product.price, product.discountPercent);
    if (
      finalPrice >= profile.priceRangeMin &&
      finalPrice <= profile.priceRangeMax
    ) {
      priceScore = 1;
    }
  }

  const keywordOverlap = product.keywords.filter((keyword) =>
    profile.favoriteProductTypes.includes(keyword.toLowerCase())
  ).length;
  const keywordScore =
    product.keywords.length > 0
      ? Math.min(1, keywordOverlap / product.keywords.length)
      : 0;

  const tagBoost = profile.interestTags.some((tag) =>
    `${product.name} ${product.categoryName} ${product.company}`
      .toLowerCase()
      .includes(tag.replace(/_interested$/, "").replace(/_/g, " "))
  )
    ? 0.2
    : 0;

  const raw =
    categoryScore * 0.35 +
    brandScore * 0.25 +
    priceScore * 0.2 +
    keywordScore * 0.2 +
    tagBoost;

  return Math.min(1, raw / 3);
}

export function scorePopularity(
  product: CandidateProduct,
  maxReviews: number
): number {
  return computeHybridScore(
    {
      _id: product._id,
      name: product.name,
      company: product.company,
      price: product.price,
      discountPercent: product.discountPercent,
      stars: product.stars,
      reviews: product.reviews,
      featured: product.featured,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      keywords: product.keywords,
      popularityScore: product.popularityScore,
    },
    {
      semanticScore: 0,
      keywordScore: 0,
      maxReviews,
    }
  );
}

export function rankSimilarityFromOrder(
  productId: Id<"products">,
  orderedIds: Id<"products">[]
): number {
  const index = orderedIds.indexOf(productId);
  if (index < 0) return 0;
  return 1 - index / Math.max(orderedIds.length, 1);
}

export function rankVectorSimilarity(score: number): number {
  return Math.max(0, Math.min(1, score));
}

export function scoreCoOccurrence(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.min(1, score / maxScore);
}

export function buildScoredProducts(
  candidates: CandidateProduct[],
  options: {
    profile: Doc<"customerRecommendationProfiles"> | null;
    similarityScores: Map<string, number>;
    coOccurrenceScores: Map<string, number>;
    aiAdjustments: Map<string, number>;
    maxReviews: number;
    weights: ScoringWeights;
    maxCoOccurrence: number;
  }
): ScoredProduct[] {
  const scored: ScoredProduct[] = [];

  for (const product of candidates) {
    const productId = product._id;
    const customerInterestScore = scoreCustomerInterest(product, options.profile);
    const productSimilarityScore =
      options.similarityScores.get(productId) ?? 0;
    const purchaseHistoryScore =
      scoreCoOccurrence(
        options.coOccurrenceScores.get(productId) ?? 0,
        options.maxCoOccurrence
      );
    const popularityScore = scorePopularity(product, options.maxReviews);
    const aiAdjustmentScore = Math.max(
      -0.1,
      Math.min(0.1, options.aiAdjustments.get(productId) ?? 0)
    );

    scored.push({
      productId,
      score: composeFinalScore(
        {
          customerInterestScore,
          productSimilarityScore,
          purchaseHistoryScore,
          popularityScore,
          aiAdjustmentScore,
        },
        options.weights
      ),
      customerInterestScore,
      productSimilarityScore,
      purchaseHistoryScore,
      popularityScore,
      aiAdjustmentScore,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

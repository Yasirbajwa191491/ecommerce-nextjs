import { calculateFinalPrice } from "../pricing";
import {
  fuzzyTermMatchesText,
  normalizeMatchText,
} from "./productTextMatch";

export type SearchProductCandidate = {
  _id: string;
  name: string;
  company: string;
  price: number;
  discountPercent: number;
  stars: number;
  reviews: number;
  featured: boolean;
  categoryId: string;
  categoryName: string;
  keywords: string[];
  popularityScore: number;
};

export type RankedCandidate = SearchProductCandidate & {
  hybridScore: number;
  semanticScore: number;
  keywordScore: number;
  exactMatchRank: number;
};

const WEIGHTS = {
  semantic: 0.4,
  keyword: 0.25,
  rating: 0.15,
  reviewCount: 0.08,
  discount: 0.05,
  popularity: 0.07,
} as const;

const CATEGORY_BOOST = 0.05;

function normalizeLog(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, Math.log1p(value) / Math.log1p(max));
}

export function computeKeywordScore(
  product: SearchProductCandidate,
  queryTerms: string[]
): number {
  if (queryTerms.length === 0) return 0;

  const haystack = [
    product.name,
    product.company,
    product.categoryName,
    ...product.keywords,
  ]
    .join(" ")
    .toLowerCase();

  let matched = 0;
  for (const term of queryTerms) {
    if (term.length >= 2 && fuzzyTermMatchesText(haystack, term)) {
      matched += 1;
    }
  }

  return matched / queryTerms.length;
}

/** Higher rank = stronger exact/text match; sorted before hybrid score. */
export function computeExactMatchRank(
  product: SearchProductCandidate,
  query: string
): number {
  const normalizedQuery = normalizeMatchText(query);
  if (!normalizedQuery) return 0;

  const normalizedName = normalizeMatchText(product.name);
  const normalizedCompany = normalizeMatchText(product.company);

  if (normalizedName === normalizedQuery) return 100;
  if (normalizedName.includes(normalizedQuery)) return 90;
  if (normalizedCompany === normalizedQuery) return 85;
  if (normalizedCompany.includes(normalizedQuery)) return 75;

  const queryTerms = normalizedQuery.split(" ").filter((term) => term.length >= 2);
  if (queryTerms.length > 0) {
    if (
      queryTerms.every((term) => fuzzyTermMatchesText(normalizedName, term))
    ) {
      return 70;
    }
    if (
      queryTerms.every(
        (term) =>
          fuzzyTermMatchesText(normalizedName, term) ||
          fuzzyTermMatchesText(normalizedCompany, term)
      )
    ) {
      return 50;
    }
  }

  return 0;
}

export function computeHybridScore(
  product: SearchProductCandidate,
  options: {
    semanticScore: number;
    keywordScore: number;
    maxReviews: number;
    categoryHint?: string;
  }
): number {
  const ratingScore = Math.min(1, product.stars / 5);
  const reviewScore = normalizeLog(product.reviews, options.maxReviews);
  const discountScore = product.discountPercent > 0 ? 1 : 0;
  const popularityScore = Math.min(1, product.popularityScore);

  let score =
    WEIGHTS.semantic * options.semanticScore +
    WEIGHTS.keyword * options.keywordScore +
    WEIGHTS.rating * ratingScore +
    WEIGHTS.reviewCount * reviewScore +
    WEIGHTS.discount * discountScore +
    WEIGHTS.popularity * popularityScore;

  if (
    options.categoryHint &&
    product.categoryName.toLowerCase() === options.categoryHint.toLowerCase()
  ) {
    score += CATEGORY_BOOST;
  }

  return score;
}

export function rankSearchCandidates(
  candidates: Map<
    string,
    SearchProductCandidate & { semanticScore: number; keywordScore: number }
  >,
  options: { categoryHint?: string; maxReviews: number; query: string }
): RankedCandidate[] {
  const ranked: RankedCandidate[] = [];

  for (const candidate of candidates.values()) {
    const exactMatchRank = computeExactMatchRank(candidate, options.query);
    ranked.push({
      ...candidate,
      exactMatchRank,
      hybridScore: computeHybridScore(candidate, {
        semanticScore: candidate.semanticScore,
        keywordScore: candidate.keywordScore,
        maxReviews: options.maxReviews,
        categoryHint: options.categoryHint,
      }),
    });
  }

  ranked.sort((a, b) => {
    const exactDiff = b.exactMatchRank - a.exactMatchRank;
    if (exactDiff !== 0) return exactDiff;
    return b.hybridScore - a.hybridScore;
  });
  return ranked;
}

export function passesPriceFilters(
  product: SearchProductCandidate,
  maxPrice?: number,
  minPrice?: number
): boolean {
  const finalPrice = calculateFinalPrice(
    product.price,
    product.discountPercent
  );
  if (maxPrice !== undefined && finalPrice > maxPrice) return false;
  if (minPrice !== undefined && finalPrice < minPrice) return false;
  return true;
}

export function passesStarFilter(
  product: SearchProductCandidate,
  minStars?: number
): boolean {
  if (minStars === undefined) return true;
  return product.stars >= minStars;
}

export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter((t) => t.length >= 2);
}

export type ParsedSearchQuery = {
  originalQuery: string;
  embeddingQuery: string;
  maxPrice?: number;
  minPrice?: number;
  minStars?: number;
  categoryHint?: string;
  categorySlug?: string;
};

const UNDER_PRICE =
  /\b(?:under|below|less than|cheaper than|max|up to)\s+\$?\s*(\d+(?:\.\d{1,2})?)\s*(?:dollars?|usd|\$)?/i;
const OVER_PRICE =
  /\b(?:over|above|more than|at least|min)\s+\$?\s*(\d+(?:\.\d{1,2})?)\s*(?:dollars?|usd|\$)?/i;
const STAR_RATING = /\b(\d(?:\.\d)?)\s*(?:\+?\s*)?stars?\b/i;
const GOOD_REVIEWS =
  /\b(?:good reviews?|highly rated|top rated|best rated|well reviewed)\b/i;

export function parseSearchQuery(
  query: string,
  categories: Array<{ name: string; slug: string }> = []
): ParsedSearchQuery {
  let working = query.trim();
  const originalQuery = working;
  let maxPrice: number | undefined;
  let minPrice: number | undefined;
  let minStars: number | undefined;
  let categoryHint: string | undefined;
  let categorySlug: string | undefined;

  const underMatch = working.match(UNDER_PRICE);
  if (underMatch?.[1]) {
    maxPrice = parseFloat(underMatch[1]);
    working = working.replace(underMatch[0], " ").trim();
  }

  const overMatch = working.match(OVER_PRICE);
  if (overMatch?.[1]) {
    minPrice = parseFloat(overMatch[1]);
    working = working.replace(overMatch[0], " ").trim();
  }

  const starMatch = working.match(STAR_RATING);
  if (starMatch?.[1]) {
    minStars = parseFloat(starMatch[1]);
    working = working.replace(starMatch[0], " ").trim();
  } else if (GOOD_REVIEWS.test(working)) {
    minStars = 4;
    working = working.replace(GOOD_REVIEWS, " ").trim();
  }

  const lowerWorking = working.toLowerCase();
  for (const category of categories) {
    const nameLower = category.name.toLowerCase();
    const slugLower = category.slug.toLowerCase();
    if (
      lowerWorking.includes(nameLower) ||
      lowerWorking.includes(slugLower.replace(/-/g, " "))
    ) {
      categoryHint = category.name;
      categorySlug = category.slug;
      break;
    }
  }

  const embeddingQuery = working.replace(/\s+/g, " ").trim() || originalQuery;

  return {
    originalQuery,
    embeddingQuery,
    maxPrice,
    minPrice,
    minStars,
    categoryHint,
    categorySlug,
  };
}

export type ParsedSearchQuery = {
  originalQuery: string;
  embeddingQuery: string;
  maxPrice?: number;
  minPrice?: number;
  minStars?: number;
  categoryHint?: string;
  categorySlug?: string;
  currency?: string;
  /** Explicit product type: alternatives must not silently replace it. */
  productTypeTerms?: string[];
};

const MONEY = String.raw`(?:(US\$|\$|USD|PKR|Rs\.?|EUR|€|GBP|£)\s*)?(\d[\d,]*(?:\.\d{1,2})?)\s*(USD|dollars?|PKR|rupees?|EUR|euros?|GBP|pounds?)?`;
const UNDER_PRICE = new RegExp(String.raw`\b(?:under|below|less than|cheaper than|max(?:imum)?|up to)\s+${MONEY}`, "i");
const OVER_PRICE = new RegExp(String.raw`\b(?:over|above|more than|at least|min(?:imum)?)\s+${MONEY}`, "i");
const PRODUCT_TYPES: Array<{ expression: RegExp; terms: string[] }> = [
  { expression: /\b(?:shoes?|sneakers?|trainers?|footwear)\b/i, terms: ["shoe", "sneaker", "trainer", "footwear"] },
  { expression: /\b(?:headphones?|earphones?|earbuds?|airpods?)\b/i, terms: ["headphone", "earphone", "earbud", "airpod"] },
  { expression: /\b(?:phones?|smartphones?|iphones?)\b/i, terms: ["phone", "smartphone", "iphone"] },
  { expression: /\b(?:laptops?|notebooks?|macbooks?)\b/i, terms: ["laptop", "notebook", "macbook"] },
  { expression: /\b(?:watches|watch|smartwatches|smartwatch)\b/i, terms: ["watch", "smartwatch"] },
  { expression: /\b(?:tablets?|ipads?)\b/i, terms: ["tablet", "ipad"] },
  { expression: /\b(?:desks?|workstations?)\b/i, terms: ["desk", "workstation"] },
  { expression: /\b(?:chairs?|seating)\b/i, terms: ["chair", "seating"] },
];

function moneyCurrency(value?: string): string | undefined {
  if (!value) return undefined;
  if (/^(?:US\$|\$|USD|dollars?)$/i.test(value)) return "USD";
  if (/^(?:PKR|Rs\.?|rupees?)$/i.test(value)) return "PKR";
  if (/^(?:EUR|€|euros?)$/i.test(value)) return "EUR";
  if (/^(?:GBP|£|pounds?)$/i.test(value)) return "GBP";
  return undefined;
}
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
  let currency: string | undefined;

  const underMatch = working.match(UNDER_PRICE);
  if (underMatch?.[2]) {
    maxPrice = Number(underMatch[2].replace(/,/g, ""));
    currency = moneyCurrency(underMatch[1] ?? underMatch[3]);
    working = working.replace(underMatch[0], " ").trim();
  }

  const overMatch = working.match(OVER_PRICE);
  if (overMatch?.[2]) {
    minPrice = Number(overMatch[2].replace(/,/g, ""));
    currency = currency ?? moneyCurrency(overMatch[1] ?? overMatch[3]);
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
  const productTypeTerms = PRODUCT_TYPES.find((type) => type.expression.test(embeddingQuery))?.terms;

  return {
    originalQuery,
    embeddingQuery,
    maxPrice,
    minPrice,
    minStars,
    categoryHint,
    categorySlug,
    currency,
    productTypeTerms,
  };
}

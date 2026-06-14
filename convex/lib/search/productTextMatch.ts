import { calculateFinalPrice } from "../pricing";

export function normalizeMatchText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "i",
  "me",
  "my",
  "im",
  "want",
  "to",
  "buy",
  "get",
  "please",
  "would",
  "like",
  "need",
  "some",
  "for",
  "this",
  "that",
  "can",
  "you",
  "show",
  "find",
  "looking",
  "let",
  "us",
  "am",
  "do",
  "does",
  "have",
  "has",
  "is",
  "are",
  "it",
  "product",
  "item",
  "something",
  "tell",
  "about",
  "know",
  "info",
  "information",
]);

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i += 1) matrix[i]![0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0]![j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost
      );
    }
  }

  return matrix[a.length]![b.length]!;
}

export function tokenizeSearchText(text: string): string[] {
  return normalizeMatchText(text)
    .split(" ")
    .filter((term) => term.length >= 2);
}

export function extractSearchTerms(query: string): string[] {
  return tokenizeSearchText(query).filter((term) => !STOP_WORDS.has(term));
}

export function fuzzyTermMatchesText(haystack: string, term: string): boolean {
  if (!term) return false;
  if (haystack.includes(term)) return true;

  const words = haystack.split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (word.includes(term) || term.includes(word)) return true;

    const maxLen = Math.max(word.length, term.length);
    if (maxLen >= 4) {
      const maxDistance = maxLen >= 7 ? 2 : 1;
      if (levenshteinDistance(word, term) <= maxDistance) return true;
    }
  }

  return false;
}

export function scoreProductTextMatch(
  product: { name: string; company: string; description: string },
  query: string
): number {
  const normalizedQuery = normalizeMatchText(query);
  if (!normalizedQuery) return 0;

  const normalizedName = normalizeMatchText(product.name);
  const normalizedCompany = normalizeMatchText(product.company);
  const haystack = normalizeMatchText(
    `${product.name} ${product.company} ${product.description}`
  );

  if (normalizedName === normalizedQuery) return 100;
  if (normalizedName.includes(normalizedQuery)) return 95;
  if (normalizedCompany.includes(normalizedQuery)) return 85;
  if (haystack.includes(normalizedQuery)) return 80;

  const terms = extractSearchTerms(query);
  if (terms.length === 0) return 0;

  let matched = 0;
  for (const term of terms) {
    if (fuzzyTermMatchesText(haystack, term)) {
      matched += 1;
    }
  }

  if (matched === 0) return 0;

  const coverage = matched / terms.length;
  const nameBoost = terms.every((term) => fuzzyTermMatchesText(normalizedName, term))
    ? 15
    : 0;

  return Math.round(coverage * 70 + nameBoost);
}

export function rankProductsByTextMatch<
  T extends { name: string; company: string; description: string },
>(products: T[], query?: string): T[] {
  if (!query?.trim()) {
    return [...products];
  }

  return products
    .map((product) => ({
      product,
      score: scoreProductTextMatch(product, query),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product);
}

/** Embedding dimensions for Xenova/all-MiniLM-L6-v2 */
export const EMBEDDING_DIMENSIONS = 384;

/** Default Gemini embedding model (text-embedding-004 retired Jan 2026) */
export const GEMINI_EMBEDDING_MODEL_DEFAULT = "gemini-embedding-001";

/** Minimum approved reviews before generating product summary */
export const MIN_REVIEWS_FOR_SUMMARY = 3;

/** Regenerate summary when review count changes by at least this many */
export const MIN_REVIEW_COUNT_DELTA = 3;

/** Regenerate summary when review count changes by at least this fraction */
export const REVIEW_COUNT_DELTA_PERCENT = 0.1;

export function shouldRegenerateInsights(
  currentCount: number,
  previousCount: number | undefined
): boolean {
  if (currentCount < MIN_REVIEWS_FOR_SUMMARY) return false;
  if (previousCount === undefined) return true;
  const delta = Math.abs(currentCount - previousCount);
  const threshold = Math.max(
    MIN_REVIEW_COUNT_DELTA,
    Math.floor(currentCount * REVIEW_COUNT_DELTA_PERCENT)
  );
  return delta >= threshold;
}

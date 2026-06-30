/** Embedding dimensions for Xenova/all-MiniLM-L6-v2 */
export const EMBEDDING_DIMENSIONS = 384;

/** SigLIP image embedding dimensions */
export const IMAGE_EMBEDDING_SIGLIP_DIMENSIONS = 768;

/** CLIP image embedding dimensions */
export const IMAGE_EMBEDDING_CLIP_DIMENSIONS = 512;

export const SIGLIP_MODEL_DEFAULT = "Xenova/siglip-base-patch16-224";
export const CLIP_MODEL_DEFAULT = "Xenova/clip-vit-base-patch32";

export const IMAGE_EMBEDDING_VERSION = "v1";

export const VISUAL_SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const IMAGE_EMBEDDING_MAX_RETRIES = 5;

export const PROVIDER_CIRCUIT_BREAKER_THRESHOLD = 3;

export const PROVIDER_CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000;

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

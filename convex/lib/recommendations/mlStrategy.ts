export const RECOMMENDATION_STRATEGIES = ["convex", "python_content"] as const;

export type RecommendationStrategy = (typeof RECOMMENDATION_STRATEGIES)[number];

export const RECOMMENDATION_STRATEGY_KEY = "recommendation_strategy";
export const RECOMMENDATION_STRATEGY_FALLBACK_KEY = "recommendation_strategy_fallback";
export const PYTHON_MODEL_VERSION_KEY = "recommendation_python_model_version";

export const DEFAULT_RECOMMENDATION_STRATEGY: RecommendationStrategy = "convex";
export const DEFAULT_STRATEGY_FALLBACK: RecommendationStrategy = "convex";
export const DEFAULT_PYTHON_MODEL_VERSION = "content-v1";

const CONTENT_SIMILAR_SECTIONS = ["because_you_viewed", "recommended_alternatives"] as const;

export function parseRecommendationStrategy(
  value: string | undefined | null
): RecommendationStrategy {
  return value?.trim() === "python_content" ? "python_content" : "convex";
}

export function assertMlStrategySetting(key: string, value: string): void {
  if (key === RECOMMENDATION_STRATEGY_KEY && value !== "convex" && value !== "python_content") {
    throw new Error("Recommendation strategy must be convex or python_content");
  }
  if (key === RECOMMENDATION_STRATEGY_FALLBACK_KEY && value !== "convex") {
    throw new Error("Recommendation strategy fallback must be convex");
  }
  if (key === PYTHON_MODEL_VERSION_KEY && value !== DEFAULT_PYTHON_MODEL_VERSION) {
    throw new Error("Python model version must be content-v1");
  }
}

export function sectionUsesContentModel(
  sectionType: string,
  productId: string | undefined
): boolean {
  if (!productId) return false;
  return (CONTENT_SIMILAR_SECTIONS as readonly string[]).includes(sectionType);
}

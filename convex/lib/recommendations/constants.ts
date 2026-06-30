export const DEFAULT_SIGNAL_WEIGHTS = {
  purchase: 1.0,
  review: 0.7,
  cart_add: 0.5,
  wishlist: 0.5,
  voice: 0.45,
  semantic_search: 0.4,
  view: 0.25,
  search: 0.2,
} as const;

export const DEFAULT_SCORING_WEIGHTS = {
  customerInterest: 0.4,
  productSimilarity: 0.3,
  purchaseHistory: 0.15,
  popularity: 0.1,
  aiAdjustment: 0.05,
} as const;

export const CUSTOMER_EMBEDDING_PROVIDER = "composite_product_vectors";
export const CUSTOMER_EMBEDDING_VERSION = "v1";

export const RECOMMENDATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const PROFILE_REFRESH_DEBOUNCE_MS = 5 * 60 * 1000;
export const RECOMMENDATION_JOB_MAX_ATTEMPTS = 5;
export const CONVEX_RECOMMENDATION_FALLBACK_DELAY_MS = 30_000;
export const CO_OCCURRENCE_BATCH_SIZE = 50;
export const PROFILE_BACKFILL_BATCH_SIZE = 5;
export const MAX_RECENTLY_VIEWED = 20;
export const MAX_RECOMMENDATIONS_PER_SECTION = 16;

export const RECOMMENDATION_SYSTEM_SETTING_KEYS = [
  "recommendation_personalization_enabled",
  "recommendation_ai_enabled",
  "recommendation_hybrid_enabled",
  "recommendation_n8n_enabled",
  "recommendation_ai_primary_provider",
  "recommendation_ai_fallback_order",
  "recommendation_refresh_hours",
  "recommendation_max_per_section",
  "recommendation_scoring_weights",
  "recommendation_fallback_strategy",
] as const;

export type RecommendationSystemSettingKey =
  (typeof RECOMMENDATION_SYSTEM_SETTING_KEYS)[number];

export const RECOMMENDATION_SYSTEM_DEFAULTS: {
  key: RecommendationSystemSettingKey;
  name: string;
  value: string;
}[] = [
  {
    key: "recommendation_personalization_enabled",
    name: "Enable Personalized Recommendations",
    value: "true",
  },
  {
    key: "recommendation_ai_enabled",
    name: "Enable AI Recommendations",
    value: "true",
  },
  {
    key: "recommendation_hybrid_enabled",
    name: "Enable Hybrid Recommendations",
    value: "true",
  },
  {
    key: "recommendation_n8n_enabled",
    name: "Enable n8n Recommendation Processing",
    value: "false",
  },
  {
    key: "recommendation_ai_primary_provider",
    name: "Recommendation AI Primary Provider",
    value: "gemini",
  },
  {
    key: "recommendation_ai_fallback_order",
    name: "Recommendation AI Fallback Order",
    value: JSON.stringify(["gemini", "groq", "openrouter", "openai"]),
  },
  {
    key: "recommendation_refresh_hours",
    name: "Recommendation Refresh Hours",
    value: "24",
  },
  {
    key: "recommendation_max_per_section",
    name: "Maximum Recommendations Per Section",
    value: "8",
  },
  {
    key: "recommendation_scoring_weights",
    name: "Recommendation Scoring Weights",
    value: JSON.stringify({
      customerInterest: 0.4,
      productSimilarity: 0.3,
      purchaseHistory: 0.15,
      popularity: 0.1,
      aiAdjustment: 0.05,
    }),
  },
  {
    key: "recommendation_fallback_strategy",
    name: "Recommendation Fallback Strategy",
    value: "personalized_then_similar_then_popular",
  },
];

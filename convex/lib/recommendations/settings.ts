import type { QueryCtx, MutationCtx } from "../../_generated/server";
import {
  DEFAULT_SCORING_WEIGHTS,
  RECOMMENDATION_CACHE_TTL_MS,
  RECOMMENDATION_SYSTEM_DEFAULTS,
} from "./constants";

export type ScoringWeights = {
  customerInterest: number;
  productSimilarity: number;
  purchaseHistory: number;
  popularity: number;
  aiAdjustment: number;
};

export type RecommendationSettings = {
  personalizationEnabled: boolean;
  aiEnabled: boolean;
  hybridEnabled: boolean;
  n8nEnabled: boolean;
  primaryProvider: string;
  fallbackOrder: string[];
  refreshHours: number;
  maxPerSection: number;
  scoringWeights: ScoringWeights;
  fallbackStrategy: string;
  cacheTtlMs: number;
};

async function getSettingValue(
  ctx: QueryCtx | MutationCtx,
  key: string,
  fallback: string
): Promise<string> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  return row?.value ?? fallback;
}

function parseBoolean(value: string, fallback: boolean): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function parseJsonArray(value: string, fallback: string[]): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : fallback;
  } catch {
    return fallback;
  }
}

function parseScoringWeights(value: string): ScoringWeights {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SCORING_WEIGHTS };
    const obj = parsed as Record<string, unknown>;
    return {
      customerInterest:
        typeof obj.customerInterest === "number"
          ? obj.customerInterest
          : DEFAULT_SCORING_WEIGHTS.customerInterest,
      productSimilarity:
        typeof obj.productSimilarity === "number"
          ? obj.productSimilarity
          : DEFAULT_SCORING_WEIGHTS.productSimilarity,
      purchaseHistory:
        typeof obj.purchaseHistory === "number"
          ? obj.purchaseHistory
          : DEFAULT_SCORING_WEIGHTS.purchaseHistory,
      popularity:
        typeof obj.popularity === "number"
          ? obj.popularity
          : DEFAULT_SCORING_WEIGHTS.popularity,
      aiAdjustment:
        typeof obj.aiAdjustment === "number"
          ? obj.aiAdjustment
          : DEFAULT_SCORING_WEIGHTS.aiAdjustment,
    };
  } catch {
    return { ...DEFAULT_SCORING_WEIGHTS };
  }
}

export async function getRecommendationSettings(
  ctx: QueryCtx | MutationCtx
): Promise<RecommendationSettings> {
  const defaults = Object.fromEntries(
    RECOMMENDATION_SYSTEM_DEFAULTS.map((item) => [item.key, item.value])
  ) as Record<string, string>;

  const refreshHoursRaw = await getSettingValue(
    ctx,
    "recommendation_refresh_hours",
    defaults.recommendation_refresh_hours ?? "24"
  );
  const refreshHours = Math.max(1, parseInt(refreshHoursRaw, 10) || 24);

  const maxPerSectionRaw = await getSettingValue(
    ctx,
    "recommendation_max_per_section",
    defaults.recommendation_max_per_section ?? "8"
  );
  const maxPerSection = Math.min(
    16,
    Math.max(1, parseInt(maxPerSectionRaw, 10) || 8)
  );

  const scoringWeightsRaw = await getSettingValue(
    ctx,
    "recommendation_scoring_weights",
    defaults.recommendation_scoring_weights ?? JSON.stringify(DEFAULT_SCORING_WEIGHTS)
  );

  return {
    personalizationEnabled: parseBoolean(
      await getSettingValue(
        ctx,
        "recommendation_personalization_enabled",
        defaults.recommendation_personalization_enabled ?? "true"
      ),
      true
    ),
    aiEnabled: parseBoolean(
      await getSettingValue(
        ctx,
        "recommendation_ai_enabled",
        defaults.recommendation_ai_enabled ?? "true"
      ),
      true
    ),
    hybridEnabled: parseBoolean(
      await getSettingValue(
        ctx,
        "recommendation_hybrid_enabled",
        defaults.recommendation_hybrid_enabled ?? "true"
      ),
      true
    ),
    n8nEnabled: parseBoolean(
      await getSettingValue(
        ctx,
        "recommendation_n8n_enabled",
        defaults.recommendation_n8n_enabled ?? "false"
      ),
      false
    ),
    primaryProvider: await getSettingValue(
      ctx,
      "recommendation_ai_primary_provider",
      defaults.recommendation_ai_primary_provider ?? "gemini"
    ),
    fallbackOrder: parseJsonArray(
      await getSettingValue(
        ctx,
        "recommendation_ai_fallback_order",
        defaults.recommendation_ai_fallback_order ??
          JSON.stringify(["gemini", "groq", "openrouter", "openai"])
      ),
      ["gemini", "groq", "openrouter", "openai"]
    ),
    refreshHours,
    maxPerSection,
    scoringWeights: parseScoringWeights(scoringWeightsRaw),
    fallbackStrategy: await getSettingValue(
      ctx,
      "recommendation_fallback_strategy",
      defaults.recommendation_fallback_strategy ??
        "personalized_then_similar_then_popular"
    ),
    cacheTtlMs: refreshHours * 60 * 60 * 1000 || RECOMMENDATION_CACHE_TTL_MS,
  };
}

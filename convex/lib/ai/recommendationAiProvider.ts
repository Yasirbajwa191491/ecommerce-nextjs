import {
  createProviderByName,
  executeWithProviderChain,
  parseProviderChain,
  type AiProviderName,
} from "./providerChain";
import type { AiProviderName as ProviderName } from "./types";
import type { RecommendationSettings } from "../recommendations/settings";

export type RecommendationAiInsight = {
  interestSummary: string;
  segments: string[];
  rankedProductIds: string[];
  explanations: Record<string, string>;
};

const INSIGHT_PROMPT = `Analyze this customer profile and product catalog context for ecommerce recommendations.
Reply JSON only:
{
  "interestSummary": "1-2 sentence shopper interest summary",
  "segments": ["segment labels"],
  "rankedProductIds": ["product id strings in priority order"],
  "explanations": { "productId": "short reason" }
}`;

function normalizeChain(
  primary: string,
  fallback: string[]
): ProviderName[] {
  const valid: ProviderName[] = [
    "gemini",
    "groq",
    "openrouter",
    "openai",
    "anthropic",
    "remote",
  ];
  return [primary, ...fallback].filter(
    (value, index, array): value is ProviderName =>
      valid.includes(value as ProviderName) && array.indexOf(value) === index
  );
}

export async function generateRecommendationInsights(
  settings: Pick<RecommendationSettings, "aiEnabled" | "primaryProvider" | "fallbackOrder">,
  contextText: string
): Promise<RecommendationAiInsight | null> {
  if (!settings.aiEnabled) return null;

  const chain = normalizeChain(
    settings.primaryProvider,
    settings.fallbackOrder
  );

  try {
    const { result } = await executeWithProviderChain(chain, async (provider) => {
      const content = await provider.summarizeReviews([`${INSIGHT_PROMPT}\n\n${contextText}`]);
      const parsed: unknown = JSON.parse(content);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid AI insight response");
      }
      const raw = parsed as Record<string, unknown>;
      return {
        interestSummary:
          typeof raw.interestSummary === "string" ? raw.interestSummary : "",
        segments: Array.isArray(raw.segments)
          ? raw.segments.filter((item): item is string => typeof item === "string")
          : [],
        rankedProductIds: Array.isArray(raw.rankedProductIds)
          ? raw.rankedProductIds.filter(
              (item): item is string => typeof item === "string"
            )
          : [],
        explanations:
          raw.explanations && typeof raw.explanations === "object"
            ? Object.fromEntries(
                Object.entries(raw.explanations as Record<string, unknown>).filter(
                  (entry): entry is [string, string] => typeof entry[1] === "string"
                )
              )
            : {},
      };
    });

    return result;
  } catch {
    return null;
  }
}

export function getDefaultRecommendationProviderChain(): AiProviderName[] {
  return parseProviderChain();
}

export { createProviderByName };

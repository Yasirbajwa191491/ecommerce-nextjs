import { EMBEDDING_DIMENSIONS, GEMINI_EMBEDDING_MODEL_DEFAULT } from "../constants";
import type {
  ModerationResult,
  ReviewAIProvider,
  ReviewForReply,
  ReviewTopic,
  SentimentResult,
} from "../types";
import {
  heuristicModeration,
  normalizeEmbedding,
  normalizeSentiment,
  parseSentimentFromJson,
  parseTagsFromJson,
  parseTopicsFromJson,
  truncate,
  fetchWithRetry,
} from "./shared";

type GeminiConfig = {
  apiKey: string;
  model: string;
  embeddingModel: string;
};

export type GeminiContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

function getGeminiConfig(config?: Partial<GeminiConfig>): GeminiConfig {
  const apiKey = config?.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in Convex environment variables");
  }

  return {
    apiKey,
    model: config?.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    embeddingModel:
      config?.embeddingModel ??
      process.env.GEMINI_EMBEDDING_MODEL ??
      GEMINI_EMBEDDING_MODEL_DEFAULT,
  };
}

export async function geminiGenerateWithParts(
  system: string,
  parts: GeminiContentPart[],
  temperature = 0.3,
  config?: Partial<GeminiConfig>
): Promise<string> {
  const resolved = getGeminiConfig(config);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolved.model}:generateContent?key=${resolved.apiKey}`;
  const response = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ parts }],
        generationConfig: { temperature },
      }),
    },
    "Gemini generate"
  );

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return String(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
}

async function geminiGenerateWithConfig(
  config: GeminiConfig,
  system: string,
  user: string,
  temperature = 0.3
): Promise<string> {
  return await geminiGenerateWithParts(
    system,
    [{ text: user }],
    temperature,
    config
  );
}

export async function geminiEmbed(
  apiKey: string,
  embeddingModel: string,
  text: string
): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent?key=${apiKey}`;
  const response = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: truncate(text, 4000) }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    },
    "Gemini embeddings"
  );

  const data = (await response.json()) as {
    embedding?: { values?: number[] };
  };
  const embedding = data.embedding?.values;
  if (!embedding?.length) {
    throw new Error("Gemini returned an empty embedding");
  }
  // Truncated Gemini dimensions must be L2-normalized before vector search.
  return normalizeEmbedding(embedding);
}

export function createGeminiProvider(
  config?: Partial<GeminiConfig>
): ReviewAIProvider {
  const apiKey = config?.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in Convex environment variables");
  }

  const resolved: GeminiConfig = {
    apiKey,
    model: config?.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    embeddingModel:
      config?.embeddingModel ??
      process.env.GEMINI_EMBEDDING_MODEL ??
      GEMINI_EMBEDDING_MODEL_DEFAULT,
  };

  return {
    name: "gemini" as const,
    model: resolved.model,
    async analyzeSentiment(text: string): Promise<SentimentResult> {
      const content = await geminiGenerateWithConfig(
        resolved,
        'Classify sentiment. Reply JSON only: {"sentiment":"positive|neutral|negative","confidence":0.95}',
        truncate(text)
      );
      return (
        parseSentimentFromJson(content) ??
        normalizeSentiment(content.split("\n")[0] ?? "neutral")
      );
    },

    async generateTags(text: string): Promise<string[]> {
      const content = await geminiGenerateWithConfig(
        resolved,
        'Return JSON array of 2-5 short tags, e.g. ["Good Quality","Fast Delivery"]',
        truncate(text)
      );
      return parseTagsFromJson(content);
    },

    async detectSpam(text: string): Promise<ModerationResult> {
      const heuristic = heuristicModeration(text);
      if (heuristic) return heuristic;

      const content = await geminiGenerateWithConfig(
        resolved,
        'Is this review spam, abusive, offensive, or promotional? Reply JSON only: {"flagged":true|false,"reason":"..."}',
        truncate(text)
      );
      try {
        const parsed = JSON.parse(
          content.match(/\{[\s\S]*\}/)?.[0] ?? '{"flagged":false}'
        ) as ModerationResult;
        return {
          flagged: Boolean(parsed.flagged),
          reason: parsed.reason,
        };
      } catch {
        return { flagged: false };
      }
    },

    async embed(text: string): Promise<number[]> {
      return await geminiEmbed(resolved.apiKey, resolved.embeddingModel, text);
    },

    async summarizeReviews(reviews: string[]): Promise<string> {
      const joined = reviews
        .slice(0, 40)
        .map((r, i) => `${i + 1}. ${r}`)
        .join("\n");
      return await geminiGenerateWithConfig(
        resolved,
        "Write a balanced 2-3 sentence product review summary for shoppers.",
        joined
      );
    },

    async extractTopics(reviews: string[]): Promise<ReviewTopic[]> {
      const content = await geminiGenerateWithConfig(
        resolved,
        'Return JSON array: [{"name":"Quality","mentionCount":12}]',
        reviews.slice(0, 40).join("\n")
      );
      return parseTopicsFromJson(content);
    },

    async generateReply(review: ReviewForReply): Promise<string> {
      return await geminiGenerateWithConfig(
        resolved,
        "Write a professional, empathetic store reply (80-120 words).",
        `Rating ${review.rating}/5 — ${review.title}\n${review.content}`
      );
    },
  };
}

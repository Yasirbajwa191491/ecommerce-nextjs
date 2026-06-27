import type {
  ModerationResult,
  ReviewAIProvider,
  ReviewForReply,
  ReviewTopic,
  SentimentResult,
} from "../types";
import { geminiEmbed } from "./gemini";
import { openaiEmbed } from "./openai";
import { GEMINI_EMBEDDING_MODEL_DEFAULT } from "../constants";
import {
  heuristicModeration,
  normalizeSentiment,
  parseSentimentFromJson,
  parseTagsFromJson,
  parseTopicsFromJson,
  truncate,
} from "./shared";

type OpenRouterConfig = {
  apiKey: string;
  model: string;
};

async function openRouterChat(
  config: OpenRouterConfig,
  system: string,
  user: string
): Promise<string> {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.CONVEX_SITE_URL ?? "https://localhost",
        "X-Title": "Ecommerce Review AI",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter chat failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return String(data.choices?.[0]?.message?.content ?? "").trim();
}

async function embedWithFallback(text: string): Promise<number[]> {
  if (process.env.OPENAI_API_KEY) {
    return await openaiEmbed(
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
      text
    );
  }
  if (process.env.GEMINI_API_KEY) {
    return await geminiEmbed(
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_EMBEDDING_MODEL ?? GEMINI_EMBEDDING_MODEL_DEFAULT,
      text
    );
  }
  throw new Error(
    "Semantic search requires OPENAI_API_KEY or GEMINI_API_KEY for embeddings when using OpenRouter"
  );
}

export function createOpenRouterProvider(
  config?: Partial<OpenRouterConfig>
): ReviewAIProvider {
  const apiKey = config?.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set in Convex environment variables"
    );
  }

  const resolved: OpenRouterConfig = {
    apiKey,
    model:
      config?.model ??
      process.env.OPENROUTER_MODEL ??
      "google/gemini-2.5-flash",
  };

  return {
    name: "openrouter" as const,
    model: resolved.model,
    async analyzeSentiment(text: string): Promise<SentimentResult> {
      const content = await openRouterChat(
        resolved,
        'Reply JSON only: {"sentiment":"positive|neutral|negative","confidence":0.95}',
        truncate(text)
      );
      return (
        parseSentimentFromJson(content) ??
        normalizeSentiment(content.split("\n")[0] ?? "neutral")
      );
    },

    async generateTags(text: string): Promise<string[]> {
      const content = await openRouterChat(
        resolved,
        'Return JSON array of 2-5 short tags, e.g. ["Good Quality","Fast Delivery"]',
        truncate(text)
      );
      return parseTagsFromJson(content);
    },

    async detectSpam(text: string): Promise<ModerationResult> {
      const heuristic = heuristicModeration(text);
      if (heuristic) return heuristic;

      const content = await openRouterChat(
        resolved,
        'Reply JSON only: {"flagged":true|false,"reason":"..."}',
        truncate(text)
      );
      try {
        const parsed = JSON.parse(
          content.match(/\{[\s\S]*\}/)?.[0] ?? '{"flagged":false}'
        ) as ModerationResult;
        return { flagged: Boolean(parsed.flagged), reason: parsed.reason };
      } catch {
        return { flagged: false };
      }
    },

    async embed(text: string): Promise<number[]> {
      return await embedWithFallback(text);
    },

    async summarizeReviews(reviews: string[]): Promise<string> {
      return await openRouterChat(
        resolved,
        "Write a balanced 2-3 sentence product review summary for shoppers.",
        reviews
          .slice(0, 40)
          .map((r, i) => `${i + 1}. ${r}`)
          .join("\n")
      );
    },

    async extractTopics(reviews: string[]): Promise<ReviewTopic[]> {
      const content = await openRouterChat(
        resolved,
        'Return JSON array: [{"name":"Quality","mentionCount":12}]',
        reviews.slice(0, 40).join("\n")
      );
      return parseTopicsFromJson(content);
    },

    async generateReply(review: ReviewForReply): Promise<string> {
      return await openRouterChat(
        resolved,
        "Write a professional, empathetic store reply (80-120 words).",
        `Rating ${review.rating}/5 — ${review.title}\n${review.content}`
      );
    },
  };
}

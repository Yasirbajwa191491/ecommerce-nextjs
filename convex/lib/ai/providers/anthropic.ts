import { GEMINI_EMBEDDING_MODEL_DEFAULT } from "../constants";
import type {
  ModerationResult,
  ReviewAIProvider,
  ReviewForReply,
  ReviewTopic,
  SentimentResult,
} from "../types";
import { geminiEmbed } from "./gemini";
import { openaiEmbed } from "./openai";
import {
  heuristicModeration,
  normalizeSentiment,
  parseSentimentFromJson,
  parseTagsFromJson,
  parseTopicsFromJson,
  truncate,
} from "./shared";

type AnthropicConfig = {
  apiKey: string;
  model: string;
};

async function anthropicMessage(
  config: AnthropicConfig,
  system: string,
  user: string
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const block = data.content?.find((item) => item.type === "text");
  return String(block?.text ?? "").trim();
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
    "Semantic search requires OPENAI_API_KEY or GEMINI_API_KEY for embeddings when using Anthropic"
  );
}

export function createAnthropicProvider(
  config?: Partial<AnthropicConfig>
): ReviewAIProvider {
  const apiKey = config?.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set in Convex environment variables"
    );
  }

  const resolved: AnthropicConfig = {
    apiKey,
    model:
      config?.model ?? process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
  };

  return {
    async analyzeSentiment(text: string): Promise<SentimentResult> {
      const content = await anthropicMessage(
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
      const content = await anthropicMessage(
        resolved,
        'Return JSON array of 2-5 short review tags, e.g. ["Good Quality","Fast Delivery"]',
        truncate(text)
      );
      return parseTagsFromJson(content);
    },

    async detectSpam(text: string): Promise<ModerationResult> {
      const heuristic = heuristicModeration(text);
      if (heuristic) return heuristic;

      const content = await anthropicMessage(
        resolved,
        'Reply JSON only: {"flagged":true|false,"reason":"Spam detected"}',
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
      return await anthropicMessage(
        resolved,
        "Write a balanced 2-3 sentence product review summary for shoppers.",
        reviews
          .slice(0, 40)
          .map((r, i) => `${i + 1}. ${r}`)
          .join("\n")
      );
    },

    async extractTopics(reviews: string[]): Promise<ReviewTopic[]> {
      const content = await anthropicMessage(
        resolved,
        'Return JSON array: [{"name":"Quality","mentionCount":12}]',
        reviews.slice(0, 40).join("\n")
      );
      return parseTopicsFromJson(content);
    },

    async generateReply(review: ReviewForReply): Promise<string> {
      return await anthropicMessage(
        resolved,
        "Write a professional, empathetic store reply (80-120 words).",
        `Rating ${review.rating}/5 — ${review.title}\n${review.content}`
      );
    },
  };
}

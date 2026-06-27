import { EMBEDDING_DIMENSIONS } from "../constants";
import type {
  ModerationResult,
  ReviewAIProvider,
  ReviewForReply,
  ReviewTopic,
  SentimentResult,
} from "../types";
import {
  buildReviewReplySystemPrompt,
  buildReviewReplyUserPrompt,
  resolveReviewReplyStoreContext,
} from "../reviewReplyPrompt";
import {
  heuristicModeration,
  normalizeSentiment,
  parseSentimentFromJson,
  parseTagsFromJson,
  parseTopicsFromJson,
  truncate,
} from "./shared";

type OpenAIConfig = {
  apiKey: string;
  model: string;
  embeddingModel: string;
};

async function openaiChat(
  config: OpenAIConfig,
  system: string,
  user: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI chat failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return String(data.choices?.[0]?.message?.content ?? "").trim();
}

export async function openaiEmbed(
  apiKey: string,
  embeddingModel: string,
  text: string
): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: embeddingModel,
      input: truncate(text, 4000),
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI embeddings failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };
  const embedding = data.data?.[0]?.embedding;
  if (!embedding?.length) {
    throw new Error("OpenAI returned an empty embedding");
  }
  return embedding;
}

async function openaiModerationApi(
  apiKey: string,
  text: string
): Promise<ModerationResult> {
  const heuristic = heuristicModeration(text);
  if (heuristic) return heuristic;

  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: truncate(text, 4000) }),
  });

  if (!response.ok) {
    return { flagged: false };
  }

  const data = (await response.json()) as {
    results?: Array<{
      flagged?: boolean;
      categories?: Record<string, boolean>;
    }>;
  };
  const result = data.results?.[0];
  if (!result?.flagged) return { flagged: false };

  const categories = result.categories ?? {};
  const hit = Object.entries(categories).find(([, value]) => value);
  const reasonMap: Record<string, string> = {
    harassment: "Abusive language detected",
    "harassment/threatening": "Threatening language detected",
    hate: "Offensive language detected",
    "hate/threatening": "Offensive language detected",
    spam: "Spam detected",
    violence: "Violent content detected",
  };

  return {
    flagged: true,
    reason: hit
      ? (reasonMap[hit[0]] ?? "Content flagged by moderation")
      : "Content flagged by moderation",
  };
}

export function createOpenAIProvider(
  config?: Partial<OpenAIConfig>
): ReviewAIProvider {
  const apiKey = config?.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in Convex environment variables");
  }

  const resolved: OpenAIConfig = {
    apiKey,
    model: config?.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    embeddingModel:
      config?.embeddingModel ??
      process.env.OPENAI_EMBEDDING_MODEL ??
      "text-embedding-3-small",
  };

  return {
    name: "openai" as const,
    model: resolved.model,
    async analyzeSentiment(text: string): Promise<SentimentResult> {
      const content = await openaiChat(
        resolved,
        "Classify product review sentiment. Reply with JSON only: {\"sentiment\":\"positive|neutral|negative\",\"confidence\":0.0-1.0}",
        truncate(text)
      );
      return (
        parseSentimentFromJson(content) ??
        normalizeSentiment(content.split("\n")[0] ?? "neutral")
      );
    },

    async generateTags(text: string): Promise<string[]> {
      const content = await openaiChat(
        resolved,
        "Extract 2-5 short product review tags (2-3 words each). Reply with JSON array only, e.g. [\"Good Quality\",\"Fast Delivery\"]",
        truncate(text)
      );
      return parseTagsFromJson(content);
    },

    async detectSpam(text: string): Promise<ModerationResult> {
      return await openaiModerationApi(resolved.apiKey, text);
    },

    async embed(text: string): Promise<number[]> {
      return await openaiEmbed(
        resolved.apiKey,
        resolved.embeddingModel,
        text
      );
    },

    async summarizeReviews(reviews: string[]): Promise<string> {
      const joined = reviews
        .slice(0, 40)
        .map((r, i) => `${i + 1}. ${r}`)
        .join("\n");
      return await openaiChat(
        resolved,
        "Write a balanced 2-3 sentence ecommerce review summary for shoppers. Mention common praise and complaints.",
        joined
      );
    },

    async extractTopics(reviews: string[]): Promise<ReviewTopic[]> {
      const joined = reviews.slice(0, 40).join("\n");
      const content = await openaiChat(
        resolved,
        'Return JSON array of top themes: [{"name":"Quality","mentionCount":12}]. Use realistic mention counts.',
        joined
      );
      return parseTopicsFromJson(content);
    },

    async generateReply(review: ReviewForReply): Promise<string> {
      const store = resolveReviewReplyStoreContext({
        storeName: review.storeName,
        storeEmail: review.storeEmail,
        storeAddress: review.storeAddress,
      });
      return await openaiChat(
        resolved,
        buildReviewReplySystemPrompt(store, review.customerName),
        buildReviewReplyUserPrompt(review)
      );
    },
  };
}

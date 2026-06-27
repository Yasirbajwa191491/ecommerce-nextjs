import type {
  ModerationResult,
  ReviewSentiment,
  ReviewTopic,
  SentimentResult,
} from "../types";

const URL_PATTERN =
  /https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|io|co|shop|store|biz)\b/i;
const REPEAT_PATTERN = /(.)\1{6,}/;

export function truncate(text: string, max = 8000): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

const RETRYABLE_HTTP_STATUS = new Set([429, 500, 502, 503, 504]);

/** Daily/free-tier quota — retrying immediately will not help. */
export function isGeminiQuotaExhausted(status: number, body: string): boolean {
  if (status !== 429) return false;
  const lower = body.toLowerCase();
  return (
    lower.includes("free_tier") ||
    lower.includes("free tier") ||
    lower.includes("quota exceeded") ||
    lower.includes("resource_exhausted") ||
    lower.includes("generaterequestsperday")
  );
}

export function isGeminiQuotaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("429") &&
    (lower.includes("quota") ||
      lower.includes("resource_exhausted") ||
      lower.includes("free_tier") ||
      lower.includes("free tier"))
  );
}

/** Parse retry delay from Gemini error JSON (seconds → ms). */
export function parseRetryDelayFromGeminiError(message: string): number | undefined {
  const retryMatch = message.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (retryMatch) {
    return Number(retryMatch[1]) * 1000;
  }
  const retryInfoMatch = message.match(/retry in ([\d.]+)s/i);
  if (retryInfoMatch) {
    return Math.ceil(Number(retryInfoMatch[1]) * 1000);
  }
  return undefined;
}

/** Retry transient LLM API failures (rate limits, overload). */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
  maxAttempts = 4
): Promise<Response> {
  let lastBody = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url, init);
    if (response.ok) return response;

    lastBody = await response.text();

    if (isGeminiQuotaExhausted(response.status, lastBody)) {
      throw new Error(`${label} failed (${response.status}): ${lastBody}`);
    }

    const retryable =
      RETRYABLE_HTTP_STATUS.has(response.status) && attempt < maxAttempts;

    if (!retryable) {
      throw new Error(`${label} failed (${response.status}): ${lastBody}`);
    }

    const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`${label} failed after ${maxAttempts} attempts: ${lastBody}`);
}

/** L2-normalize embedding vectors (required for Gemini truncated dimensions). */
export function normalizeEmbedding(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) return values;
  return values.map((value) => value / norm);
}

export function parseJsonArray<T>(text: string): T[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed: unknown = JSON.parse(match[0]);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function parseJsonObject<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

export function heuristicModeration(text: string): ModerationResult | null {
  if (URL_PATTERN.test(text)) {
    return { flagged: true, reason: "Promotional links detected" };
  }
  if (REPEAT_PATTERN.test(text)) {
    return { flagged: true, reason: "Repetitive content detected" };
  }
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 20) {
    const upper = letters.replace(/[^A-Z]/g, "").length;
    if (upper / letters.length >= 0.7) {
      return { flagged: true, reason: "Excessive caps detected" };
    }
  }
  return null;
}

export function normalizeSentiment(
  value: string,
  confidence = 0.85
): SentimentResult {
  const lower = value.toLowerCase();
  if (lower.includes("positive")) {
    return { sentiment: "positive", confidence };
  }
  if (lower.includes("negative")) {
    return { sentiment: "negative", confidence };
  }
  return { sentiment: "neutral", confidence };
}

export function parseSentimentFromJson(text: string): SentimentResult | null {
  const parsed = parseJsonObject<{
    sentiment?: string;
    confidence?: number;
  }>(text);
  if (!parsed?.sentiment) return null;
  const sentiment = parsed.sentiment.toLowerCase();
  if (
    sentiment !== "positive" &&
    sentiment !== "neutral" &&
    sentiment !== "negative"
  ) {
    return null;
  }
  return {
    sentiment: sentiment as ReviewSentiment,
    confidence:
      typeof parsed.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.85,
  };
}

export function parseTopicsFromJson(text: string): ReviewTopic[] {
  const items = parseJsonArray<{ name?: string; mentionCount?: number }>(text);
  return items
    .map((item) => ({
      name: String(item.name ?? "").trim(),
      mentionCount: Number(item.mentionCount ?? 1),
    }))
    .filter((item) => item.name)
    .slice(0, 8);
}

export function parseTagsFromJson(text: string): string[] {
  const tags = parseJsonArray<string>(text)
    .map((tag) => String(tag).trim())
    .filter(Boolean);
  return tags.slice(0, 5);
}

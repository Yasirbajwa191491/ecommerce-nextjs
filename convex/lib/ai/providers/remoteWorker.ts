import type {
  ModerationResult,
  ReviewAIProvider,
  ReviewForReply,
  ReviewTopic,
  SentimentResult,
} from "../types";

type WorkerConfig = {
  baseUrl: string;
  secret: string;
};

async function postJson<T>(
  config: WorkerConfig,
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const url = `${config.baseUrl.replace(/\/$/, "")}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AI-Worker-Key": config.secret,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI worker ${path} failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

export function createRemoteWorkerProvider(config: WorkerConfig): ReviewAIProvider {
  return {
    name: "remote" as const,
    model: "remote-worker",
    async analyzeSentiment(text: string): Promise<SentimentResult> {
      return await postJson<SentimentResult>(config, "/sentiment", { text });
    },

    async generateTags(text: string): Promise<string[]> {
      const result = await postJson<{ tags: string[] }>(config, "/tags", {
        text,
      });
      return result.tags;
    },

    async detectSpam(text: string): Promise<ModerationResult> {
      return await postJson<ModerationResult>(config, "/moderate", { text });
    },

    async embed(text: string): Promise<number[]> {
      const result = await postJson<{ embedding: number[] }>(config, "/embed", {
        text,
      });
      return result.embedding;
    },

    async summarizeReviews(reviews: string[]): Promise<string> {
      const result = await postJson<{ summary: string }>(config, "/summarize", {
        reviews,
      });
      return result.summary;
    },

    async extractTopics(reviews: string[]): Promise<ReviewTopic[]> {
      const result = await postJson<{ topics: ReviewTopic[] }>(
        config,
        "/topics",
        { reviews }
      );
      return result.topics;
    },

    async generateReply(review: ReviewForReply): Promise<string> {
      const result = await postJson<{ reply: string }>(config, "/reply", {
        review,
      });
      return result.reply;
    },
  };
}

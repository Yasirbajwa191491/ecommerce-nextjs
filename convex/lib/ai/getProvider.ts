import type { ReviewAIProvider } from "./types";
import { createOpenAIProvider } from "./providers/openai";
import { createRemoteWorkerProvider } from "./providers/remoteWorker";

export function getReviewAIProvider(): ReviewAIProvider {
  const provider = process.env.AI_PROVIDER ?? "remote";

  if (provider === "openai") {
    return createOpenAIProvider();
  }

  const baseUrl = process.env.AI_WORKER_URL;
  const secret = process.env.AI_WORKER_SECRET ?? "";

  if (!baseUrl) {
    throw new Error(
      "AI_WORKER_URL is not configured. Start the review-ai-worker or set AI_WORKER_URL in Convex."
    );
  }

  return createRemoteWorkerProvider({ baseUrl, secret });
}

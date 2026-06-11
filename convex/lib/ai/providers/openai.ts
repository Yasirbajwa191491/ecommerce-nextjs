import type { ReviewAIProvider } from "../types";

/**
 * Stub for future OpenAI / Claude / Gemini integration.
 * Swap AI_PROVIDER=openai once implemented.
 */
export function createOpenAIProvider(): ReviewAIProvider {
  throw new Error(
    "OpenAI provider is not implemented. Set AI_PROVIDER=remote and configure AI_WORKER_URL."
  );
}

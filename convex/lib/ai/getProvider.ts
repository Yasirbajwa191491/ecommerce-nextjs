import type { ReviewAIProvider } from "./types";
import { createAnthropicProvider } from "./providers/anthropic";
import { createGeminiProvider } from "./providers/gemini";
import { createGroqProvider } from "./providers/groq";
import { createOpenAIProvider } from "./providers/openai";
import { createRemoteWorkerProvider } from "./providers/remoteWorker";

export type AiProviderName =
  | "openai"
  | "gemini"
  | "anthropic"
  | "groq"
  | "remote";

function detectDefaultProvider(): AiProviderName {
  const explicit = process.env.AI_PROVIDER as AiProviderName | undefined;
  if (
    explicit &&
    ["openai", "gemini", "anthropic", "groq", "remote"].includes(explicit)
  ) {
    return explicit;
  }

  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.AI_WORKER_URL) return "remote";

  throw new Error(
    "No AI provider configured. Set AI_PROVIDER and an API key in Convex env (e.g. OPENAI_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, or ANTHROPIC_API_KEY)."
  );
}

export function getReviewAIProvider(): ReviewAIProvider {
  const provider = detectDefaultProvider();

  switch (provider) {
    case "openai":
      return createOpenAIProvider();
    case "gemini":
      return createGeminiProvider();
    case "anthropic":
      return createAnthropicProvider();
    case "groq":
      return createGroqProvider();
    case "remote": {
      const baseUrl = process.env.AI_WORKER_URL;
      const secret = process.env.AI_WORKER_SECRET ?? "";
      if (!baseUrl) {
        throw new Error(
          "AI_WORKER_URL is not configured. Use an LLM API key instead, or set AI_WORKER_URL."
        );
      }
      return createRemoteWorkerProvider({ baseUrl, secret });
    }
    default:
      throw new Error(`Unknown AI_PROVIDER: ${provider}`);
  }
}

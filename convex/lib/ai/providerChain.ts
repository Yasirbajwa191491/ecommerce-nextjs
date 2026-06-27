import type { AiProviderName, ReviewAIProvider } from "./types";
import { createGeminiProvider } from "./providers/gemini";
import { createGroqProvider } from "./providers/groq";
import { createOpenAIProvider } from "./providers/openai";
import { createOpenRouterProvider } from "./providers/openrouter";
import { createAnthropicProvider } from "./providers/anthropic";
import { createRemoteWorkerProvider } from "./providers/remoteWorker";
import { getPrimaryProviderName } from "./featureFlags";

export type { AiProviderName };

const DEFAULT_CHAIN: AiProviderName[] = [
  "gemini",
  "groq",
  "openrouter",
  "openai",
];

export function parseProviderChain(): AiProviderName[] {
  const raw =
    process.env.AI_PROVIDER_CHAIN ??
    process.env.AI_FALLBACK_PROVIDER_ORDER ??
    DEFAULT_CHAIN.join(",");

  const names = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean) as AiProviderName[];

  const valid: AiProviderName[] = [
    "gemini",
    "groq",
    "openrouter",
    "openai",
    "anthropic",
    "remote",
  ];

  const filtered = names.filter((n): n is AiProviderName =>
    valid.includes(n as AiProviderName)
  );

  return filtered.length > 0 ? filtered : DEFAULT_CHAIN;
}

export function createProviderByName(name: AiProviderName): ReviewAIProvider {
  switch (name) {
    case "gemini":
      return createGeminiProvider();
    case "groq":
      return createGroqProvider();
    case "openrouter":
      return createOpenRouterProvider();
    case "openai":
      return createOpenAIProvider();
    case "anthropic":
      return createAnthropicProvider();
    case "remote": {
      const baseUrl = process.env.AI_WORKER_URL;
      const secret = process.env.AI_WORKER_SECRET ?? "";
      if (!baseUrl) {
        throw new Error("AI_WORKER_URL is not configured");
      }
      return createRemoteWorkerProvider({ baseUrl, secret });
    }
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

export function isProviderConfigured(name: AiProviderName): boolean {
  switch (name) {
    case "gemini":
      return Boolean(process.env.GEMINI_API_KEY);
    case "groq":
      return Boolean(process.env.GROQ_API_KEY);
    case "openrouter":
      return Boolean(process.env.OPENROUTER_API_KEY);
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY);
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY);
    case "remote":
      return Boolean(process.env.AI_WORKER_URL);
    default:
      return false;
  }
}

export function getFallbackProviderChain(): AiProviderName[] {
  const chain = parseProviderChain();
  const primary = getPrimaryProviderName() as AiProviderName;
  return chain.filter((p) => p !== primary && isProviderConfigured(p));
}

export type ProviderAttemptLog = {
  provider: string;
  model: string;
  success: boolean;
  error?: string;
  durationMs: number;
};

export async function executeWithProviderChain<T>(
  chain: AiProviderName[],
  fn: (provider: ReviewAIProvider) => Promise<T>
): Promise<{ result: T; log: ProviderAttemptLog[]; provider: ReviewAIProvider }> {
  const log: ProviderAttemptLog[] = [];

  for (const name of chain) {
    if (!isProviderConfigured(name)) continue;

    const provider = createProviderByName(name);
    const start = Date.now();
    try {
      const result = await fn(provider);
      log.push({
        provider: name,
        model: provider.model,
        success: true,
        durationMs: Date.now() - start,
      });
      return { result, log, provider };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Provider call failed";
      log.push({
        provider: name,
        model: provider.model,
        success: false,
        error: message,
        durationMs: Date.now() - start,
      });
    }
  }

  throw new Error(
    `All providers failed: ${log.map((l) => `${l.provider}: ${l.error}`).join("; ")}`
  );
}

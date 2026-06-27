/**
 * Feature flags for hybrid Review AI architecture.
 * Primary Gemini pipeline is always active; these gate additive behavior only.
 */

export function isN8nFallbackEnabled(): boolean {
  return process.env.REVIEW_AI_N8N_FALLBACK_ENABLED === "true";
}

export function isVersioningEnabled(): boolean {
  return process.env.REVIEW_AI_VERSIONING_ENABLED !== "false";
}

export function getPrimaryProviderName(): string {
  return process.env.AI_PROVIDER ?? "gemini";
}

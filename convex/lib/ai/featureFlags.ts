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

export function isProductContentN8nEnabled(): boolean {
  return process.env.PRODUCT_CONTENT_N8N_ENABLED !== "false";
}

export function isProductContentN8nConfigured(): boolean {
  return Boolean(process.env.N8N_REVIEW_WEBHOOK_URL?.trim());
}

export function isImageEmbeddingN8nEnabled(): boolean {
  return process.env.IMAGE_EMBEDDING_N8N_ENABLED !== "false";
}

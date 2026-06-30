export type ProductAiContentProvider = "gemini" | "n8n";

export const PRODUCT_AI_PROVIDER_STORAGE_KEY = "product-ai-content-provider";

export function readProductAiProvider(): ProductAiContentProvider {
  if (typeof window === "undefined") return "gemini";
  return window.localStorage.getItem(PRODUCT_AI_PROVIDER_STORAGE_KEY) === "n8n"
    ? "n8n"
    : "gemini";
}

export function writeProductAiProvider(
  provider: ProductAiContentProvider
): void {
  window.localStorage.setItem(PRODUCT_AI_PROVIDER_STORAGE_KEY, provider);
}

import { createGeminiProvider } from "./providers/gemini";
import { parseJsonObject, truncate, fetchWithRetry } from "./providers/shared";
import type {
  ProductForIntelligence,
  ProductIntelligencePayload,
} from "./productIntelligenceTypes";

export {
  buildReviewHighlights,
  buildProductEmbeddingText,
  computeProductContentHash,
} from "./productIntelligenceHelpers";

export async function generateProductIntelligence(
  product: ProductForIntelligence
): Promise<ProductIntelligencePayload> {
  const userPrompt = truncate(
    [
      `Product: ${product.name}`,
      `Brand: ${product.company}`,
      `Category: ${product.categoryName}`,
      `Price: ${product.price} ${product.currency}`,
      `Rating: ${product.stars}/5 (${product.reviews} reviews)`,
      `Description: ${product.description}`,
      product.reviewHighlights.length
        ? `Customer review themes: ${product.reviewHighlights.join("; ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n")
  );

  const systemPrompt =
    'Generate ecommerce product intelligence for semantic search. Reply JSON only: {"summary":"2-3 sentence shopper summary","keywords":["5-10 search keywords"],"useCases":["3-5 use cases"],"highlights":["3-5 product highlights"]}';

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.3 },
      }),
    },
    "Gemini product intelligence"
  );

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = String(
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  ).trim();

  const parsed = parseJsonObject<{
    summary?: string;
    keywords?: string[];
    useCases?: string[];
    highlights?: string[];
  }>(content);

  return {
    summary: parsed?.summary?.trim() ?? product.description.slice(0, 200),
    keywords: (parsed?.keywords ?? []).filter(Boolean).slice(0, 12),
    useCases: (parsed?.useCases ?? []).filter(Boolean).slice(0, 8),
    highlights: (parsed?.highlights ?? []).filter(Boolean).slice(0, 8),
  };
}

export async function embedProductText(text: string): Promise<number[]> {
  const provider = createGeminiProvider();
  return await provider.embed(text);
}

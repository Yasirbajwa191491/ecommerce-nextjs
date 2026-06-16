import { geminiGenerateWithParts } from "./providers/gemini";
import { parseJsonObject, truncate } from "./providers/shared";
import type { CopilotIntent } from "./copilotTypes";
import type { CopilotResponse } from "./copilotTypes";
import { getDataSourcesForIntents } from "./copilotRouter";

const SYSTEM_PROMPT = `You are an expert ecommerce business analyst assistant for store administrators.
You receive structured business data from the store's analytics systems.
You must ONLY use the provided data — never invent metrics, product names, or trends.
Respond with valid JSON only, no markdown fences.

JSON schema:
{
  "summary": "1-3 sentence direct answer",
  "keyFindings": ["bullet point", ...],
  "recommendations": ["actionable step", ...],
  "dataSourcesUsed": ["Orders", "Products", ...],
  "followUpQuestions": ["question?", ...]
}

Rules:
- Be concise, professional, and actionable.
- Include specific numbers from the data when available.
- keyFindings: 3-6 bullets max.
- recommendations: 2-5 actionable steps.
- followUpQuestions: 2-3 relevant follow-ups.
- dataSourcesUsed must reflect which data domains you actually used.
- Use human-readable source names like "Orders", "Products", "Reviews" — never intent keys like "overview" or "revenue".
- When topProductsThisWeek is empty, use topProductsThisMonth or mostSellingProduct from the data.
- For "most selling" or "best selling" questions, prioritize mostSellingByUnits and topProducts rankings.
- For stock questions, use inventory.highestStockProducts, inventory.lowStock, products.highestStockProducts, or storeSnapshot.highestStockProducts — never say data is unavailable if these arrays exist.
- For "highest stock", "most stock", or "top stock" questions, list products from highestStockProducts sorted by stock descending.
- For order questions, use orders.thisMonth or orders.thisWeek with statusBreakdown and recentOrders.
- storeSnapshot is always available — use it for quick follow-up answers when detailed intent data is sparse.
- Answer every part of multi-part questions using all relevant sections in the structured data.`;

type RawCopilotResponse = {
  summary?: string;
  keyFindings?: string[];
  recommendations?: string[];
  dataSourcesUsed?: string[];
  followUpQuestions?: string[];
};

function normalizeResponse(
  raw: RawCopilotResponse | null,
  fallbackSources: string[]
): CopilotResponse {
  return {
    summary:
      typeof raw?.summary === "string" && raw.summary.trim()
        ? raw.summary.trim()
        : "I analyzed your store data but could not generate a complete summary. Please try rephrasing your question.",
    keyFindings: Array.isArray(raw?.keyFindings)
      ? raw.keyFindings.filter((f) => typeof f === "string").slice(0, 6)
      : [],
    recommendations: Array.isArray(raw?.recommendations)
      ? raw.recommendations.filter((r) => typeof r === "string").slice(0, 5)
      : [],
    dataSourcesUsed:
      Array.isArray(raw?.dataSourcesUsed) && raw.dataSourcesUsed.length > 0
        ? raw.dataSourcesUsed.filter((s) => typeof s === "string")
        : fallbackSources,
    followUpQuestions: Array.isArray(raw?.followUpQuestions)
      ? raw.followUpQuestions.filter((q) => typeof q === "string").slice(0, 3)
      : [
          "Would you like more detail on revenue trends?",
          "Would you like product promotion recommendations?",
        ],
  };
}

export async function generateCopilotInsight(args: {
  question: string;
  intents: CopilotIntent[];
  businessData: Record<string, unknown>;
}): Promise<CopilotResponse> {
  const fallbackSources = getDataSourcesForIntents(args.intents);
  const dataJson = truncate(JSON.stringify(args.businessData, null, 2), 16000);

  const userPrompt = `Admin question: ${args.question}

Detected analysis areas: ${args.intents.join(", ")}

Structured store data:
${dataJson}

Analyze this data and answer the admin's question. Return JSON only.`;

  const rawText = await geminiGenerateWithParts(SYSTEM_PROMPT, [
    { text: userPrompt },
  ]);

  const parsed = parseJsonObject<RawCopilotResponse>(rawText);
  return normalizeResponse(parsed, fallbackSources);
}

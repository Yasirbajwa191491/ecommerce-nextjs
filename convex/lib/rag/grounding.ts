import type { RagGroundingMode } from "./config";

export const RAG_SAFE_FALLBACK =
  "I don't have enough verified store information to answer that. Please check the product page or the shipping and return policies.";

const MONEY = /(?:\$|USD\s*)(\d+(?:\.\d{1,2})?)/g;
const LEAK =
  /ignore previous instructions|api[_ ]?key|sk-[A-Za-z0-9]{8,}|BEGIN SYSTEM|system prompt/i;
const ORDER_CLAIM =
  /\b(order (has been|was) placed|I placed your order|payment (is|was) complete)\b/i;
const IN_STOCK = /\bin stock\b/i;
const OUT_OF_STOCK = /\bout of stock\b/i;
const URL = /https?:\/\/\S+|www\.\S+/gi;
const MARKDOWN_LINK = /\[[^\]]+\]\([^)]+\)/g;

export type RagFact = {
  productId: string;
  price: number | null;
  finalPrice: number | null;
  stock: number | null;
  available: boolean;
};

export type RagGroundingChunk = {
  chunkId: string;
  productId?: string | null;
};

export type RagGroundingResult = {
  answer: string;
  citationIds: string[];
  grounded: boolean;
  reasons: string[];
};

function moneyValues(answer: string): number[] {
  return Array.from(answer.matchAll(MONEY), (match) => Number(match[1])).filter((value) =>
    Number.isFinite(value)
  );
}

function priceMatches(amount: number, fact: RagFact): boolean {
  return [fact.finalPrice, fact.price].some(
    (candidate) => candidate !== null && Math.abs(candidate - amount) < 0.02
  );
}

export function sanitizeRagAnswer(answer: string): string {
  return answer.replace(URL, "").replace(MARKDOWN_LINK, "").replace(/\s+/g, " ").trim();
}

function isAbstention(answer: string): boolean {
  const lowered = answer.toLowerCase();
  return (
    lowered.includes("don't have") ||
    lowered.includes("do not have") ||
    lowered.includes("not included") ||
    lowered.includes("cannot confirm")
  );
}

export function validateRagGrounding(input: {
  answer: string;
  citationIds: string[];
  chunks: RagGroundingChunk[];
  facts: RagFact[];
  mode: RagGroundingMode;
}): RagGroundingResult {
  const cleaned = sanitizeRagAnswer(input.answer);
  const knownIds = new Set(input.chunks.map((chunk) => chunk.chunkId));
  const known = input.citationIds.filter((id) => knownIds.has(id));
  const unknown = input.citationIds.filter((id) => !knownIds.has(id));
  const cited = input.chunks.filter((chunk) => known.includes(chunk.chunkId));
  const factMap = new Map(input.facts.map((fact) => [fact.productId, fact]));
  const citedFacts = cited
    .map((chunk) => (chunk.productId ? factMap.get(chunk.productId) : undefined))
    .filter((fact): fact is RagFact => fact !== undefined);
  const reasons: string[] = [];
  if (LEAK.test(cleaned) || ORDER_CLAIM.test(cleaned)) reasons.push("unsafe_output");
  const amounts = moneyValues(cleaned);
  const priceConflict =
    amounts.length > 0 &&
    (citedFacts.length === 0 ||
      amounts.some((amount) => !citedFacts.some((fact) => priceMatches(amount, fact))));
  if (priceConflict) reasons.push("price_mismatch");
  if (
    citedFacts.length > 0 &&
    IN_STOCK.test(cleaned) &&
    citedFacts.every((fact) => fact.stock === 0 || !fact.available)
  ) {
    reasons.push("stock_mismatch");
  }
  if (
    citedFacts.length > 0 &&
    OUT_OF_STOCK.test(cleaned) &&
    citedFacts.every((fact) => fact.stock !== null && fact.stock > 0 && fact.available)
  ) {
    reasons.push("stock_mismatch");
  }
  if (unknown.length > 0) reasons.push("invalid_citation");
  if (input.chunks.length > 0 && known.length === 0 && cleaned && !isAbstention(cleaned)) {
    reasons.push("missing_citation");
  }
  if (input.chunks.length === 0 && cleaned && !isAbstention(cleaned)) reasons.push("unsupported");

  const fatal = new Set(reasons);
  if (input.mode === "strict" && fatal.size > 0) {
    return { answer: RAG_SAFE_FALLBACK, citationIds: [], grounded: false, reasons };
  }
  if (
    input.mode === "standard" &&
    (fatal.has("unsafe_output") ||
      fatal.has("unsupported") ||
      fatal.has("price_mismatch") ||
      fatal.has("stock_mismatch"))
  ) {
    return { answer: RAG_SAFE_FALLBACK, citationIds: [], grounded: false, reasons };
  }
  let citationIds = known;
  if (input.mode === "standard" && fatal.has("missing_citation") && citationIds.length === 0) {
    citationIds = input.chunks.slice(0, 3).map((chunk) => chunk.chunkId);
  }
  const grounded =
    fatal.size === 0 ||
    (input.mode === "standard" &&
      [...fatal].every((reason) => reason === "invalid_citation" || reason === "missing_citation"));
  return {
    answer: cleaned || RAG_SAFE_FALLBACK,
    citationIds,
    grounded: grounded && Boolean(cleaned),
    reasons,
  };
}

export function parseRagModelPayload(raw: string): { answer: string; citationIds: string[] } {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { answer: raw.trim(), citationIds: [] };
  try {
    const payload: unknown = JSON.parse(match[0]);
    if (!payload || typeof payload !== "object") return { answer: raw.trim(), citationIds: [] };
    const record = payload as Record<string, unknown>;
    const answer = typeof record.answer === "string" ? record.answer.trim() : raw.trim();
    const citationIds = Array.isArray(record.citation_ids)
      ? record.citation_ids.filter((item): item is string => typeof item === "string")
      : [];
    return { answer, citationIds };
  } catch {
    return { answer: raw.trim(), citationIds: [] };
  }
}

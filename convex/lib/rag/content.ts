import { FAQ_ITEMS } from "../storeGuideContent";

const POLICY_URLS: Record<string, string> = {
  shipping_policy: "/shipping",
  return_policy: "/return",
  privacy_policy: "/privacy",
  terms: "/terms",
  faq: "/ai-shopping",
};

export function plainTextFromSetting(value: string): string {
  const raw = value.trim();
  if (!raw.startsWith("{")) return raw;
  try {
    const parsed: unknown = JSON.parse(raw);
    const parts: string[] = [];
    const walk = (node: unknown) => {
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (!node || typeof node !== "object") return;
      const record = node as Record<string, unknown>;
      if (record.type === "text" && typeof record.text === "string") parts.push(record.text);
      if (Array.isArray(record.content)) record.content.forEach(walk);
    };
    walk(parsed);
    return parts.join("\n").trim();
  } catch {
    return raw;
  }
}

export function citationUrl(sourceType: string, productId: string | null | undefined): string {
  if (sourceType === "product" && productId && /^[A-Za-z0-9_-]{1,128}$/.test(productId)) {
    return `/product/${productId}`;
  }
  return POLICY_URLS[sourceType] ?? "/ai-shopping";
}

export function faqSources(): { source_id: string; question: string; answer: string; active: true }[] {
  return FAQ_ITEMS.map((item) => ({
    source_id: item.question
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80),
    question: item.question,
    answer: item.answer,
    active: true as const,
  }));
}

export type RagSessionTurn = {
  role: "user" | "assistant";
  text: string;
  productIds: string[];
};

const MAX_TURNS = 6;
const MAX_TEXT = 500;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ASKS_PER_HOUR = 30;

export function sanitizeSessionKey(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9-]{8,64}$/.test(trimmed)) return null;
  return trimmed;
}

export function readSessionTurns(turnsJson: string, now: number, expiresAt: number): RagSessionTurn[] {
  if (now >= expiresAt) return [];
  try {
    const parsed: unknown = JSON.parse(turnsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is RagSessionTurn => {
        if (!item || typeof item !== "object") return false;
        const record = item as Record<string, unknown>;
        return (
          (record.role === "user" || record.role === "assistant") &&
          typeof record.text === "string" &&
          Array.isArray(record.productIds)
        );
      })
      .slice(-MAX_TURNS)
      .map((turn) => ({
        role: turn.role,
        text: turn.text.slice(0, MAX_TEXT),
        productIds: turn.productIds.filter((id) => typeof id === "string").slice(0, 8),
      }));
  } catch {
    return [];
  }
}

export function appendSessionTurns(
  existing: RagSessionTurn[],
  question: string,
  answer: string,
  productIds: string[]
): { turnsJson: string; expiresAt: number } {
  const next = [
    ...existing,
    { role: "user" as const, text: question.slice(0, MAX_TEXT), productIds: [] },
    {
      role: "assistant" as const,
      text: answer.slice(0, MAX_TEXT),
      productIds: productIds.slice(0, 8),
    },
  ].slice(-MAX_TURNS);
  return { turnsJson: JSON.stringify(next), expiresAt: Date.now() + SESSION_TTL_MS };
}

export function sessionAllowsAsk(askCount: number, windowStartedAt: number, now: number): boolean {
  if (now - windowStartedAt > 60 * 60 * 1000) return true;
  return askCount < MAX_ASKS_PER_HOUR;
}

export function nextAskCount(askCount: number, windowStartedAt: number, now: number): {
  askCount: number;
  windowStartedAt: number;
} {
  if (now - windowStartedAt > 60 * 60 * 1000) {
    return { askCount: 1, windowStartedAt: now };
  }
  return { askCount: askCount + 1, windowStartedAt };
}

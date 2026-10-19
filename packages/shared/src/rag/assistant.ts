export type RagCitationView = {
  sourceType: string;
  sourceId: string;
  productId: string | null;
  title: string;
  section: string;
  url: string;
};

export type RagProductView = {
  id: string;
  name: string;
  url: string;
};

export type RagAskView = {
  status: "disabled" | "answered" | "empty" | "unavailable";
  answer: string;
  citations: RagCitationView[];
  products: RagProductView[];
  intent: string;
};

export type RagAssistantState = "hidden" | "idle" | "loading" | "answered" | "empty" | "error";

const ALLOWED_PATHS = new Set(["/shipping", "/return", "/privacy", "/terms", "/ai-shopping"]);

export function ragAssistantVisible(enabled: boolean | undefined): boolean {
  return enabled === true;
}

export function safeCitationHref(url: string): string | null {
  if (ALLOWED_PATHS.has(url)) return url;
  if (/^\/product\/[A-Za-z0-9_-]{1,128}$/.test(url)) return url;
  return null;
}

export function ragAssistantState(input: {
  enabled: boolean | undefined;
  loading: boolean;
  error: boolean;
  result: RagAskView | null;
}): RagAssistantState {
  if (!ragAssistantVisible(input.enabled)) return "hidden";
  if (input.loading) return "loading";
  if (input.error) return "error";
  if (!input.result) return "idle";
  if (input.result.status === "empty" || input.result.status === "disabled") return "empty";
  if (input.result.status === "unavailable") return "error";
  return "answered";
}

export function visibleCitations(citations: RagCitationView[]): RagCitationView[] {
  return citations.filter((citation) => safeCitationHref(citation.url) !== null);
}

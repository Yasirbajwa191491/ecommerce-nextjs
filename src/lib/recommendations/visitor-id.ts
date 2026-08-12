const VISITOR_ID_KEY = "shop-visitor-id";

export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

export function getCheckoutCustomerEmail(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem("checkoutCustomer");
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      "email" in parsed &&
      typeof (parsed as { email?: unknown }).email === "string"
    ) {
      return (parsed as { email: string }).email.trim().toLowerCase();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export const RECOMMENDATION_ATTRIBUTION_KEY = "shop-recommendation-attribution";

export type RecommendationAttribution = {
  sectionType: string;
  productId: string;
  cacheKey?: string;
  clickedAt: number;
};

export function setRecommendationAttribution(
  attribution: RecommendationAttribution
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    RECOMMENDATION_ATTRIBUTION_KEY,
    JSON.stringify(attribution)
  );
}

export function getRecommendationAttribution():
  | RecommendationAttribution
  | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(RECOMMENDATION_ATTRIBUTION_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as RecommendationAttribution;
  } catch {
    return undefined;
  }
}

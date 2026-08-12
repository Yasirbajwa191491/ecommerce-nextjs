const RECENTLY_VIEWED_KEY = "storefrontRecentlyViewed";
const MAX_ITEMS = 12;

export function getRecentlyViewedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(productId: string) {
  if (typeof window === "undefined") return;
  const existing = getRecentlyViewedIds().filter((id) => id !== productId);
  const next = [productId, ...existing].slice(0, MAX_ITEMS);
  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("storefront:recently-viewed-change"));
}

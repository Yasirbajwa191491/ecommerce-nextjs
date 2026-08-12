const WISHLIST_STORAGE_KEY = "storefrontWishlist";

export function getWishlistIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function setWishlistIds(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
}

export function toggleWishlistId(productId: string): boolean {
  const ids = getWishlistIds();
  const exists = ids.includes(productId);
  const next = exists
    ? ids.filter((id) => id !== productId)
    : [...ids, productId];
  setWishlistIds(next);
  return !exists;
}

export function isInWishlist(productId: string): boolean {
  return getWishlistIds().includes(productId);
}

export function removeWishlistId(productId: string) {
  setWishlistIds(getWishlistIds().filter((id) => id !== productId));
}

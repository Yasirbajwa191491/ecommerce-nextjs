import type { Product } from "@/types/product";
import { MAX_RECENTLY_VIEWED } from "@/lib/offline/constants";
import { offlineKeys } from "@/lib/offline/keys";
import { cacheProducts, getCachedProduct } from "@/lib/offline/product-store";
import { readCache, writeCache } from "@/lib/offline/storage";

export type RecentlyViewedEntry = {
  productId: string;
  viewedAt: number;
};

type Listener = () => void;

let entries: RecentlyViewedEntry[] = [];
let hydrated = false;
let hydratePromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

let revision = 0;

function bump() {
  revision += 1;
  emit();
}

export function getRecentlyViewedRevision(): number {
  return revision;
}

export async function hydrateRecentlyViewed(): Promise<void> {
  if (hydrated) return;
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    const cached = await readCache<RecentlyViewedEntry[]>(offlineKeys.recentlyViewed);
    entries = Array.isArray(cached?.data) ? cached.data : [];
    hydrated = true;
    bump();
  })();

  return hydratePromise;
}

export function getRecentlyViewedEntries(): RecentlyViewedEntry[] {
  return entries;
}

export function getRecentlyViewedProducts(): Product[] {
  const products: Product[] = [];
  for (const entry of entries) {
    const product = getCachedProduct(entry.productId);
    if (product) products.push(product);
  }
  return products;
}

export async function recordRecentlyViewed(product: Product): Promise<void> {
  await hydrateRecentlyViewed();
  const productId = product._id;
  entries = [
    { productId, viewedAt: Date.now() },
    ...entries.filter((entry) => entry.productId !== productId),
  ].slice(0, MAX_RECENTLY_VIEWED);
  bump();
  await Promise.all([
    cacheProducts([product]),
    writeCache(offlineKeys.recentlyViewed, entries),
  ]);
}

export function subscribeRecentlyViewed(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function resetRecentlyViewed(): Promise<void> {
  entries = [];
  hydrated = true;
  bump();
  await writeCache(offlineKeys.recentlyViewed, entries);
}

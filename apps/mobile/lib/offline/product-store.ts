import type { Product } from "@/types/product";
import { MAX_CACHED_PRODUCTS } from "@/lib/offline/constants";
import { offlineKeys } from "@/lib/offline/keys";
import { readCache, writeCache } from "@/lib/offline/storage";

type ProductCacheEntry = {
  product: Product;
  cachedAt: number;
  lastAccess: number;
};

type ProductStoreSnapshot = {
  items: Record<string, ProductCacheEntry>;
};

type Listener = () => void;

let items: Record<string, ProductCacheEntry> = {};
let version = 0;
let hydrated = false;
let hydratePromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

async function persist() {
  await writeCache<ProductStoreSnapshot>(offlineKeys.productStore, { items });
}

export async function hydrateProductStore(): Promise<void> {
  if (hydrated) return;
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    const cached = await readCache<ProductStoreSnapshot>(offlineKeys.productStore);
    if (cached?.data?.items && typeof cached.data.items === "object") {
      items = cached.data.items;
      emit();
    }
    hydrated = true;
  })();

  return hydratePromise;
}

function evictIfNeeded() {
  const ids = Object.keys(items);
  if (ids.length <= MAX_CACHED_PRODUCTS) return;

  const ranked = ids.sort(
    (a, b) => (items[a]?.lastAccess ?? 0) - (items[b]?.lastAccess ?? 0)
  );
  const removeCount = ids.length - MAX_CACHED_PRODUCTS;
  for (const id of ranked.slice(0, removeCount)) {
    delete items[id];
  }
}

export function getCachedProduct(id: string): Product | undefined {
  const entry = items[id];
  if (!entry) return undefined;
  entry.lastAccess = Date.now();
  return entry.product;
}

export function getCachedProducts(ids: string[]): Product[] {
  const now = Date.now();
  const result: Product[] = [];
  for (const id of ids) {
    const entry = items[id];
    if (!entry) continue;
    entry.lastAccess = now;
    result.push(entry.product);
  }
  return result;
}

export function getAllCachedProducts(): Product[] {
  return Object.values(items).map((entry) => entry.product);
}

export async function cacheProducts(products: Product[] | undefined | null): Promise<void> {
  if (!products || products.length === 0) return;
  await hydrateProductStore();

  const now = Date.now();
  let changed = false;
  for (const product of products) {
    if (!product?._id) continue;
    items[product._id] = {
      product,
      cachedAt: now,
      lastAccess: now,
    };
    changed = true;
  }

  if (!changed) return;
  evictIfNeeded();
  emit();
  await persist();
}

export function subscribeProductStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getProductStoreVersion(): number {
  return version;
}

export function isProductStoreHydrated(): boolean {
  return hydrated;
}

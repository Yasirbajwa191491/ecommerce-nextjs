import type { Id } from "@convex/_generated/dataModel";

import { MAX_QUEUE_ATTEMPTS, MAX_WISHLIST_QUEUE } from "@/lib/offline/constants";
import { offlineKeys } from "@/lib/offline/keys";
import { readCache, writeCache } from "@/lib/offline/storage";

export type WishlistQueueItem = {
  productId: Id<"products">;
  add: boolean;
  queuedAt: number;
  attempts: number;
};

type Listener = () => void;

let queued: WishlistQueueItem[] = [];
let cachedIds: string[] = [];
let hydrated = false;
let hydratePromise: Promise<void> | null = null;
let draining = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

async function persistQueue() {
  await writeCache(offlineKeys.wishlistQueue, queued);
}

async function persistIds(ids: string[]) {
  cachedIds = ids;
  await writeCache(offlineKeys.wishlistIds, ids);
}

export async function hydrateWishlistStore(): Promise<void> {
  if (hydrated) return;
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    const [queueCache, idsCache] = await Promise.all([
      readCache<WishlistQueueItem[]>(offlineKeys.wishlistQueue),
      readCache<string[]>(offlineKeys.wishlistIds),
    ]);
    queued = Array.isArray(queueCache?.data) ? queueCache.data : [];
    cachedIds = Array.isArray(idsCache?.data) ? idsCache.data : [];
    hydrated = true;
    emit();
  })();

  return hydratePromise;
}

export function getCachedWishlistIds(): string[] {
  return cachedIds;
}

export function getWishlistQueue(): WishlistQueueItem[] {
  return queued;
}

export function mergeWishlistIds(
  serverIds: string[] | undefined,
  pending: WishlistQueueItem[] = queued
): Set<string> {
  const set = new Set(serverIds ?? cachedIds);
  for (const item of pending) {
    if (item.add) set.add(item.productId);
    else set.delete(item.productId);
  }
  return set;
}

export async function cacheWishlistIds(ids: string[]): Promise<void> {
  await hydrateWishlistStore();
  await persistIds(ids);
  const server = new Set(ids);
  const next = queued.filter((item) => server.has(item.productId) !== item.add);
  if (next.length !== queued.length) {
    queued = next;
    await persistQueue();
  }
  emit();
}

export async function enqueueWishlistChange(
  productId: Id<"products">,
  add: boolean
): Promise<void> {
  await hydrateWishlistStore();
  queued = [
    ...queued.filter((item) => item.productId !== productId),
    { productId, add, queuedAt: Date.now(), attempts: 0 },
  ].slice(-MAX_WISHLIST_QUEUE);
  emit();
  await persistQueue();
}

export async function resetWishlistAttempts(): Promise<void> {
  if (queued.every((item) => item.attempts === 0)) return;
  queued = queued.map((item) => ({ ...item, attempts: 0 }));
  await persistQueue();
}

export async function drainWishlistQueue(
  syncItem: (item: WishlistQueueItem) => Promise<void>
): Promise<void> {
  if (draining) return;
  await hydrateWishlistStore();
  if (queued.length === 0) return;

  draining = true;
  try {
    const remaining: WishlistQueueItem[] = [];
    for (let index = 0; index < queued.length; index += 1) {
      const item = queued[index];
      if (item.attempts >= MAX_QUEUE_ATTEMPTS) {
        remaining.push(item);
        continue;
      }
      try {
        await syncItem(item);
      } catch {
        remaining.push({ ...item, attempts: item.attempts + 1 });
        remaining.push(...queued.slice(index + 1));
        queued = remaining;
        emit();
        await persistQueue();
        return;
      }
    }
    queued = remaining;
    emit();
    await persistQueue();
  } finally {
    draining = false;
  }
}

export function subscribeWishlistStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

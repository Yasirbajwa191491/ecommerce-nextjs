import type { Id } from "@convex/_generated/dataModel";

import { MAX_QUEUE_ATTEMPTS, MAX_WISHLIST_QUEUE } from "@/lib/offline/constants";
import { offlineKeys } from "@/lib/offline/keys";
import { readCache, writeCache } from "@/lib/offline/storage";

export type WishlistQueueItem = {
  operationId: string;
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
let operationSequence = 0;

function createOperationId(): string {
  operationSequence += 1;
  return `${Date.now().toString(36)}-${operationSequence.toString(36)}-${Math.random().toString(36).slice(2)}`;
}

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
    queued = Array.isArray(queueCache?.data)
      ? queueCache.data.map((item) => ({ ...item, operationId: item.operationId || createOperationId() }))
      : [];
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
    if (item.attempts >= MAX_QUEUE_ATTEMPTS) continue;
    if (item.add) set.add(item.productId);
    else set.delete(item.productId);
  }
  return set;
}

export async function cacheWishlistIds(ids: string[]): Promise<void> {
  await hydrateWishlistStore();
  await persistIds(ids);
  // A matching subscription snapshot may predate an in-flight opposite operation.
  // Only the response acknowledging this exact operation may remove it.
  emit();
}

export async function enqueueWishlistChange(
  productId: Id<"products">,
  add: boolean
): Promise<WishlistQueueItem> {
  await hydrateWishlistStore();
  const operation: WishlistQueueItem = {
    operationId: createOperationId(), productId, add, queuedAt: Date.now(), attempts: 0,
  };
  queued = [
    ...queued.filter((item) => item.productId !== productId),
    operation,
  ].slice(-MAX_WISHLIST_QUEUE);
  emit();
  await persistQueue();
  return operation;
}

export async function dequeueWishlistChange(
  operation: WishlistQueueItem
): Promise<void> {
  await hydrateWishlistStore();
  const next = queued.filter((item) => item.operationId !== operation.operationId);
  if (next.length === queued.length) return;
  queued = next;
  emit();
  await persistQueue();
}

export async function dropDeadLetterItems(): Promise<void> {
  await hydrateWishlistStore();
  const next = queued.filter((item) => item.attempts < MAX_QUEUE_ATTEMPTS);
  if (next.length === queued.length) return;
  queued = next;
  emit();
  await persistQueue();
}

/** Both direct mutations and reconnect draining acknowledge the operation sent. */
export async function syncWishlistChange<T>(
  operation: WishlistQueueItem,
  send: () => Promise<T>
): Promise<T> {
  const result = await send();
  await dequeueWishlistChange(operation);
  return result;
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
  if (draining) return;
  const snapshot = queued.map((item) => ({ ...item }));
  if (snapshot.length === 0) return;

  draining = true;
  try {
    for (const item of snapshot) {
      const current = queued.find(
        (queuedItem) =>
          queuedItem.operationId === item.operationId
      );
      if (!current || current.attempts >= MAX_QUEUE_ATTEMPTS) {
        if (current && current.attempts >= MAX_QUEUE_ATTEMPTS) {
          queued = queued.filter(
            (queuedItem) =>
              !(
                queuedItem.operationId === current.operationId
              )
          );
        }
        continue;
      }
      try {
        await syncWishlistChange(current, () => syncItem(current));
      } catch {
        queued = queued.map((queuedItem) =>
          queuedItem.operationId === item.operationId
            ? { ...queuedItem, attempts: queuedItem.attempts + 1 }
            : queuedItem
        );
        break;
      }
    }
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

export async function resetWishlistStore(): Promise<void> {
  queued = [];
  cachedIds = [];
  hydrated = true;
  emit();
  await Promise.all([persistQueue(), persistIds([])]);
}

import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
  },
}));

import type { Id } from "@convex/_generated/dataModel";

import {
  drainWishlistQueue,
  cacheWishlistIds,
  enqueueWishlistChange,
  getWishlistQueue,
  resetWishlistStore,
  syncWishlistChange,
} from "./wishlist-queue";

const productA = "products:a" as Id<"products">;

describe("wishlist queue drain", () => {
  beforeEach(async () => {
    store.clear();
    await resetWishlistStore();
  });

  it("keeps a newer change that arrives while an older sync is in flight", async () => {
    await enqueueWishlistChange(productA, true);
    let releaseSync: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      releaseSync = resolve;
    });
    let markStarted: () => void = () => undefined;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    const synced: boolean[] = [];

    const drainPromise = drainWishlistQueue(async (item) => {
      synced.push(item.add);
      markStarted();
      await gate;
    });

    await started;
    await enqueueWishlistChange(productA, false);
    releaseSync();
    await drainPromise;

    expect(getWishlistQueue()).toEqual([
      expect.objectContaining({ productId: productA, add: false }),
    ]);
    expect(synced).toEqual([true]);
  });

  it("an old direct online response acknowledges only the operation it sent", async () => {
    const oldOperation = await enqueueWishlistChange(productA, true);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let markStarted: () => void = () => undefined;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    const pending = syncWishlistChange(oldOperation, async () => {
      markStarted();
      await gate;
      return true;
    });
    await started;
    const newer = await enqueueWishlistChange(productA, false);
    release();
    await expect(pending).resolves.toBe(true);
    expect(getWishlistQueue()).toEqual([newer]);
  });

  it("a matching old subscription cannot acknowledge a queued opposite change", async () => {
    const older = await enqueueWishlistChange(productA, true);
    const newer = await enqueueWishlistChange(productA, false);
    await cacheWishlistIds([]);
    expect(getWishlistQueue()).toEqual([newer]);
    await syncWishlistChange(older, async () => true);
    expect(getWishlistQueue()).toEqual([newer]);
  });

  it("operations remain distinct when queued in the same millisecond", async () => {
    const first = await enqueueWishlistChange(productA, true);
    const second = await enqueueWishlistChange(productA, true);
    expect(first.operationId).not.toBe(second.operationId);
    await syncWishlistChange(first, async () => true);
    expect(getWishlistQueue()).toEqual([second]);
  });
});

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
  enqueueWishlistChange,
  getWishlistQueue,
  resetWishlistStore,
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

    const drainPromise = drainWishlistQueue(async (item) => {
      if (item.add) {
        await enqueueWishlistChange(productA, false);
        await gate;
      }
    });

    await enqueueWishlistChange(productA, false);
    releaseSync();
    await drainPromise;

    expect(getWishlistQueue()).toEqual([
      expect.objectContaining({ productId: productA, add: false }),
    ]);
  });
});

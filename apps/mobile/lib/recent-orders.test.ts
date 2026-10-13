import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("expo-secure-store", () => ({
  isAvailableAsync: vi.fn(), getItemAsync: vi.fn(), setItemAsync: vi.fn(), deleteItemAsync: vi.fn(), AFTER_FIRST_UNLOCK: "after-unlock",
}));
import * as SecureStore from "expo-secure-store";
import { forgetRecentOrder, loadRecentOrders, saveRecentOrder } from "./recent-orders";

describe("protected recent order history", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.mocked(SecureStore.isAvailableAsync).mockResolvedValue(true);
    vi.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => store.get(key) ?? null);
    vi.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { store.set(key, value); });
    vi.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => { store.delete(key); });
  });
  it("retains five purchases, newest first, with the correct credentials", async () => {
    await Promise.all(Array.from({ length: 7 }, (_, index) => saveRecentOrder({ orderNumber: `ORD-${index}`, email: `Buyer${index}@Example.com`, accessToken: `proof-${index}` })));
    const orders = await loadRecentOrders();
    expect(orders.map((order) => order.orderNumber)).toEqual(["ORD-6", "ORD-5", "ORD-4", "ORD-3", "ORD-2"]);
    expect(orders[0]).toMatchObject({ email: "buyer6@example.com", accessToken: "proof-6" });
    expect(store.has("recentOrders.ORD-0")).toBe(false);
  });
  it("does not store unverified orders or use an insecure fallback", async () => {
    await saveRecentOrder({ orderNumber: "ORD-1", email: "buyer@example.com", accessToken: "" });
    expect(await loadRecentOrders()).toEqual([]);
    vi.mocked(SecureStore.isAvailableAsync).mockResolvedValue(false);
    await saveRecentOrder({ orderNumber: "ORD-1", email: "buyer@example.com", accessToken: "proof" });
    expect(store.size).toBe(0);
  });
  it("deduplicates a purchase and lets the shopper remove its access proof", async () => {
    await saveRecentOrder({ orderNumber: "ORD-1", email: "buyer@example.com", accessToken: "old-proof" });
    await saveRecentOrder({ orderNumber: "ORD-1", email: "buyer@example.com", accessToken: "current-proof" });
    expect(await loadRecentOrders()).toHaveLength(1);
    expect((await loadRecentOrders())[0].accessToken).toBe("current-proof");
    await forgetRecentOrder("ORD-1");
    expect(await loadRecentOrders()).toEqual([]);
    expect(store.has("recentOrders.ORD-1")).toBe(false);
  });
  it("ignores corrupted and mismatched records", async () => {
    store.set("recentOrders.index", JSON.stringify(["ORD-1", "ORD-2"]));
    store.set("recentOrders.ORD-1", "broken");
    store.set("recentOrders.ORD-2", JSON.stringify({ orderNumber: "ORD-other", email: "buyer@example.com", accessToken: "proof", savedAt: 1 }));
    expect(await loadRecentOrders()).toEqual([]);
  });
});

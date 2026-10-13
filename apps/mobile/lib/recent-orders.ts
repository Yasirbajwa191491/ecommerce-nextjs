import * as SecureStore from "expo-secure-store";

export type RecentOrder = { orderNumber: string; email: string; accessToken: string; savedAt: number };
const INDEX_KEY = "recentOrders.index";
const MAX_RECENT_ORDERS = 5;
const orderKey = (orderNumber: string) => `recentOrders.${orderNumber}`;
let writeQueue = Promise.resolve();

function isRecentOrder(value: unknown): value is RecentOrder {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.orderNumber === "string" && /^[a-zA-Z0-9._-]{1,100}$/.test(record.orderNumber)
    && typeof record.email === "string" && record.email.length <= 254 && record.email.includes("@")
    && typeof record.accessToken === "string" && record.accessToken.length > 0 && record.accessToken.length <= 512
    && typeof record.savedAt === "number" && Number.isFinite(record.savedAt);
}

async function loadIndex(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(INDEX_KEY);
  if (!raw) return [];
  const values: unknown = JSON.parse(raw);
  if (!Array.isArray(values)) return [];
  return values.filter((value): value is string => typeof value === "string" && /^[a-zA-Z0-9._-]{1,100}$/.test(value)).slice(0, MAX_RECENT_ORDERS);
}

/** Order access tokens stay in the native keychain. Skip history when secure storage is unavailable. */
export async function loadRecentOrders(): Promise<RecentOrder[]> {
  try {
    if (!await SecureStore.isAvailableAsync()) return [];
    const index = await loadIndex();
    const orders = await Promise.all(index.map(async (orderNumber) => {
      const raw = await SecureStore.getItemAsync(orderKey(orderNumber));
      if (!raw) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        return isRecentOrder(parsed) && parsed.orderNumber === orderNumber ? parsed : null;
      } catch { return null; }
    }));
    return orders.filter((order): order is RecentOrder => order !== null);
  } catch { return []; }
}

export function saveRecentOrder(order: Omit<RecentOrder, "savedAt">): Promise<void> {
  const record = { ...order, email: order.email.trim().toLowerCase(), accessToken: order.accessToken.trim(), savedAt: Date.now() };
  if (!isRecentOrder(record)) return Promise.resolve();
  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    if (!await SecureStore.isAvailableAsync()) return;
    const current = await loadIndex().catch(() => []);
    const next = [record.orderNumber, ...current.filter((number) => number !== record.orderNumber)].slice(0, MAX_RECENT_ORDERS);
    await SecureStore.setItemAsync(orderKey(record.orderNumber), JSON.stringify(record), { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
    await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(next), { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
    await Promise.all(current.filter((number) => !next.includes(number)).map((number) => SecureStore.deleteItemAsync(orderKey(number))));
  });
  return writeQueue.catch(() => undefined);
}

export function forgetRecentOrder(orderNumber: string): Promise<void> {
  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    if (!await SecureStore.isAvailableAsync() || !/^[a-zA-Z0-9._-]{1,100}$/.test(orderNumber)) return;
    const current = await loadIndex();
    await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(current.filter((number) => number !== orderNumber)), { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
    await SecureStore.deleteItemAsync(orderKey(orderNumber));
  });
  return writeQueue.catch(() => undefined);
}

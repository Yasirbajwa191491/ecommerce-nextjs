import AsyncStorage from "@react-native-async-storage/async-storage";

import { CACHE_PREFIX, CACHE_VERSION, MAX_CATEGORY_CACHES } from "@/lib/offline/constants";

export type CacheEnvelope<T> = {
  version: number;
  cachedAt: number;
  data: T;
};

const writeChain: Record<string, Promise<void>> = {};

function enqueueWrite(key: string, task: () => Promise<void>): Promise<void> {
  const previous = writeChain[key] ?? Promise.resolve();
  const next = previous.then(task, task);
  writeChain[key] = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

export async function readCache<T>(key: string, ttlMs?: number): Promise<CacheEnvelope<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== CACHE_VERSION ||
      parsed.data === undefined ||
      typeof parsed.cachedAt !== "number"
    ) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    if (ttlMs !== undefined && Date.now() - parsed.cachedAt > ttlMs) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore secondary cleanup failures
    }
    return null;
  }
}

export async function writeCache<T>(key: string, data: T): Promise<number> {
  const cachedAt = Date.now();
  const envelope: CacheEnvelope<T> = {
    version: CACHE_VERSION,
    cachedAt,
    data,
  };
  await enqueueWrite(key, async () => {
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  });
  if (key.startsWith(`${CACHE_PREFIX}category:`)) {
    void pruneKeysByPrefix(`${CACHE_PREFIX}category:`, MAX_CATEGORY_CACHES);
  }
  if (key.startsWith(`${CACHE_PREFIX}shop:`)) {
    void pruneKeysByPrefix(`${CACHE_PREFIX}shop:`, MAX_CATEGORY_CACHES);
  }
  return cachedAt;
}

export async function removeCache(key: string): Promise<void> {
  await enqueueWrite(key, async () => {
    await AsyncStorage.removeItem(key);
  });
}

export async function clearIncompatibleCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const stale = keys.filter(
      (key) => key.startsWith("@offline/") && !key.startsWith(CACHE_PREFIX)
    );
    if (stale.length > 0) {
      await AsyncStorage.multiRemove(stale);
    }
  } catch {
    // Non-blocking cleanup
  }
}

async function pruneKeysByPrefix(prefix: string, maxKeys: number): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix));
    if (keys.length <= maxKeys) return;

    const entries = await AsyncStorage.multiGet(keys);
    const ranked = entries
      .map(([key, raw]) => {
        try {
          const parsed = JSON.parse(raw ?? "") as CacheEnvelope<unknown>;
          return { key, cachedAt: typeof parsed.cachedAt === "number" ? parsed.cachedAt : 0 };
        } catch {
          return { key, cachedAt: 0 };
        }
      })
      .sort((a, b) => a.cachedAt - b.cachedAt);

    const toRemove = ranked.slice(0, ranked.length - maxKeys).map((entry) => entry.key);
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch {
    // Non-blocking cleanup
  }
}

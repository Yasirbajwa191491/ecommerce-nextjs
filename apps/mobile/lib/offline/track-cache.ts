import { offlineKeys } from "@/lib/offline/keys";
import { readCache, writeCache } from "@/lib/offline/storage";
import { TTL } from "@/lib/offline/constants";

export type CachedTrackByOrder = {
  method: "order-number";
  query: string;
  cachedAt: number;
  result: unknown;
};

export async function saveTrackByOrderCache(query: string, result: unknown): Promise<void> {
  await writeCache<CachedTrackByOrder>(offlineKeys.lastTrack, {
    method: "order-number",
    query,
    cachedAt: Date.now(),
    result,
  });
}

export async function loadTrackByOrderCache(
  query: string
): Promise<CachedTrackByOrder | null> {
  const cached = await readCache<CachedTrackByOrder>(offlineKeys.lastTrack);
  if (!cached?.data) return null;
  if (cached.data.method !== "order-number") return null;
  if (cached.data.query.trim().toLowerCase() !== query.trim().toLowerCase()) {
    return null;
  }
  if (Date.now() - cached.cachedAt > TTL.trackOrder) {
    return null;
  }
  return { ...cached.data, cachedAt: cached.cachedAt };
}

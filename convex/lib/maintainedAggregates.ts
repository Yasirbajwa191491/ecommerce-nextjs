import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbCtx = QueryCtx | MutationCtx;

export type OrderStatusCounts = Record<string, number>;

export type CatalogCounts = {
  active: number;
  inactive: number;
  minFinalPrice: number;
  maxFinalPrice: number;
};

export type RecommendationCounts = {
  profileCount: number;
  cacheCount: number;
  pendingJobs: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
};

const EMPTY_RECOMMENDATIONS: RecommendationCounts = {
  profileCount: 0,
  cacheCount: 0,
  pendingJobs: 0,
  totalImpressions: 0,
  totalClicks: 0,
  totalConversions: 0,
};

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) return parsed as T;
  } catch {
    return fallback;
  }
  return fallback;
}

export async function readAggregate<T>(ctx: DbCtx, key: string, fallback: T): Promise<T> {
  const row = await ctx.db
    .query("maintainedAggregates")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (!row) return fallback;
  return parseJson(row.ready ? row.countsJson : row.buildingJson ?? row.countsJson, fallback);
}

export async function readRecommendationCounts(ctx: DbCtx): Promise<RecommendationCounts> {
  const counts = await readAggregate(ctx, "recommendations", EMPTY_RECOMMENDATIONS);
  return { ...EMPTY_RECOMMENDATIONS, ...counts };
}

async function updateAggregate(
  ctx: MutationCtx,
  key: string,
  update: (current: Record<string, number>) => Record<string, number>
): Promise<void> {
  const existing = await ctx.db
    .query("maintainedAggregates")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  const current = parseJson<Record<string, number>>(existing?.countsJson, {});
  const next = update({ ...current });
  const countsJson = JSON.stringify(next);
  if (!existing) {
    await ctx.db.insert("maintainedAggregates", {
      key,
      countsJson,
      ready: true,
      updatedAt: Date.now(),
    });
    return;
  }
  const building = existing.buildingJson
    ? update(parseJson<Record<string, number>>(existing.buildingJson, {}))
    : undefined;
  await ctx.db.patch(existing._id, {
    countsJson,
    buildingJson: building ? JSON.stringify(building) : existing.buildingJson,
    ready: true,
    updatedAt: Date.now(),
  });
}

export async function adjustRecommendationCounts(
  ctx: MutationCtx,
  delta: Partial<RecommendationCounts>
): Promise<void> {
  await updateAggregate(ctx, "recommendations", (current) => {
    const next = { ...EMPTY_RECOMMENDATIONS, ...current };
    for (const [key, amount] of Object.entries(delta)) {
      const name = key as keyof RecommendationCounts;
      next[name] = Math.max(0, (next[name] ?? 0) + (amount ?? 0));
    }
    return next;
  });
}

export async function adjustOrderStatusCount(
  ctx: MutationCtx,
  previous: string | null,
  next: string | null
): Promise<void> {
  if (previous === next) return;
  await updateAggregate(ctx, "orders", (current) => {
    const counts = { ...current };
    if (previous) counts[previous] = Math.max(0, (counts[previous] ?? 0) - 1);
    if (next) counts[next] = (counts[next] ?? 0) + 1;
    counts.all = Math.max(0, (counts.all ?? 0) + (previous ? -1 : 0) + (next ? 1 : 0));
    return counts;
  });
}

export async function adjustCatalogCounts(
  ctx: MutationCtx,
  delta: { active?: number; inactive?: number }
): Promise<void> {
  await updateAggregate(ctx, "catalog", (current) => ({
    active: Math.max(0, (current.active ?? 0) + (delta.active ?? 0)),
    inactive: Math.max(0, (current.inactive ?? 0) + (delta.inactive ?? 0)),
    minFinalPrice: current.minFinalPrice ?? 0,
    maxFinalPrice: current.maxFinalPrice ?? 0,
  }));
}

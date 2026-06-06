import type { MutationCtx } from "../_generated/server";

const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

export async function checkAndIncrementRateLimit(
  ctx: MutationCtx,
  bucketKey: string,
  options?: { maxAttempts?: number; windowMs?: number }
): Promise<RateLimitResult> {
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();

  const existing = await ctx.db
    .query("trackingRateLimits")
    .withIndex("by_bucket_key", (q) => q.eq("bucketKey", bucketKey))
    .unique();

  if (!existing) {
    await ctx.db.insert("trackingRateLimits", {
      bucketKey,
      attemptCount: 1,
      windowStart: now,
    });
    return { allowed: true };
  }

  const windowExpired = now - existing.windowStart >= windowMs;
  if (windowExpired) {
    await ctx.db.patch(existing._id, {
      attemptCount: 1,
      windowStart: now,
    });
    return { allowed: true };
  }

  if (existing.attemptCount >= maxAttempts) {
    const retryAfterMs = windowMs - (now - existing.windowStart);
    return { allowed: false, retryAfterMs };
  }

  await ctx.db.patch(existing._id, {
    attemptCount: existing.attemptCount + 1,
  });
  return { allowed: true };
}

export function buildTrackingBucketKey(type: string, identifier: string): string {
  return `${type}:${identifier.trim().toLowerCase()}`;
}

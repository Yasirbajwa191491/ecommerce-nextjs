import type { QueryCtx } from "../_generated/server";

export async function computeReviewAiQueueStats(ctx: QueryCtx) {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  const [pending, processing, retryScheduled, failed, completedRecent] =
    await Promise.all([
      ctx.db
        .query("reviewAiJobs")
        .withIndex("by_status_priority", (q) => q.eq("status", "pending"))
        .take(500),
      ctx.db
        .query("reviewAiJobs")
        .withIndex("by_status_priority", (q) => q.eq("status", "processing"))
        .take(500),
      ctx.db
        .query("reviewAiJobs")
        .withIndex("by_status_next_retry", (q) =>
          q.eq("status", "retry_scheduled")
        )
        .take(500),
      ctx.db
        .query("reviewAiJobs")
        .withIndex("by_status_priority", (q) => q.eq("status", "failed"))
        .take(500),
      ctx.db
        .query("reviewAiJobs")
        .withIndex("by_status_priority", (q) => q.eq("status", "completed"))
        .take(500),
    ]);

  const completedLast24h = completedRecent.filter(
    (job) => job.completedAt != null && job.completedAt >= dayAgo
  ).length;

  const oldestPending = pending.sort((a, b) => a.createdAt - b.createdAt)[0];

  return {
    pending: pending.length,
    processing: processing.length,
    retryScheduled: retryScheduled.length,
    failed: failed.length,
    completedLast24h,
    oldestPendingAgeMs: oldestPending
      ? now - oldestPending.createdAt
      : undefined,
  };
}

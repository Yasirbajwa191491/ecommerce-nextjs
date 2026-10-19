export type MonitorOutcome = "success" | "failure" | "timeout" | "fallback";

export type MonitorBucket = {
  family: string;
  modelVersion: string;
  timeBucket: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  fallbackCount: number;
  latencyCount: number;
  latencySumMs: number;
  latencyMaxMs: number;
  lastErrorCategory: string;
};

const FORBIDDEN = ["email", "prompt", "phone", "address", "card", "password", "token", "payment"];

export function emptyBucket(family: string, modelVersion: string, timeBucket: string): MonitorBucket {
  return {
    family,
    modelVersion,
    timeBucket,
    requestCount: 0,
    successCount: 0,
    failureCount: 0,
    timeoutCount: 0,
    fallbackCount: 0,
    latencyCount: 0,
    latencySumMs: 0,
    latencyMaxMs: 0,
    lastErrorCategory: "",
  };
}

export function foldMonitoring(
  bucket: MonitorBucket,
  event: { outcome: MonitorOutcome; latencyMs: number; errorCategory?: string },
  extra: Record<string, unknown> = {}
): MonitorBucket {
  if (FORBIDDEN.some((key) => key in extra)) {
    throw new Error("sensitive_field");
  }
  const next = { ...bucket, requestCount: bucket.requestCount + 1 };
  if (event.outcome === "success") next.successCount += 1;
  if (event.outcome === "failure") {
    next.failureCount += 1;
    next.lastErrorCategory = (event.errorCategory ?? "").slice(0, 80);
  }
  if (event.outcome === "timeout") {
    next.timeoutCount += 1;
    next.lastErrorCategory = "timeout";
  }
  if (event.outcome === "fallback") next.fallbackCount += 1;
  if (event.latencyMs >= 0) {
    next.latencyCount += 1;
    next.latencySumMs += event.latencyMs;
    next.latencyMaxMs = Math.max(next.latencyMaxMs, event.latencyMs);
  }
  return next;
}

export function bucketExpired(timeBucket: string, today: string, retentionDays: number): boolean {
  const start = Date.parse(`${timeBucket}T00:00:00.000Z`);
  const end = Date.parse(`${today}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  return (end - start) / 86_400_000 > retentionDays;
}

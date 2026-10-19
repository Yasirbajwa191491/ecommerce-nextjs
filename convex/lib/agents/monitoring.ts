export type MetricName =
  | "runsStarted"
  | "runsCompleted"
  | "runsFailed"
  | "runsCancelled"
  | "runsExpired"
  | "toolSuccess"
  | "toolFailure"
  | "approvalRequests"
  | "approvalDecisions"
  | "providerFailures"
  | "fallbackUsage"
  | "totalSteps"
  | "totalLatencyMs";

export type AgentMetricSnapshot = Record<MetricName, number> & {
  day: string;
  updatedAt: number;
};

export function emptyMetrics(day: string, now: number): AgentMetricSnapshot {
  return {
    day,
    runsStarted: 0,
    runsCompleted: 0,
    runsFailed: 0,
    runsCancelled: 0,
    runsExpired: 0,
    toolSuccess: 0,
    toolFailure: 0,
    approvalRequests: 0,
    approvalDecisions: 0,
    providerFailures: 0,
    fallbackUsage: 0,
    totalSteps: 0,
    totalLatencyMs: 0,
    updatedAt: now,
  };
}

export function bumpMetric(
  snapshot: AgentMetricSnapshot,
  name: MetricName,
  amount = 1,
  now = Date.now()
): AgentMetricSnapshot {
  return { ...snapshot, [name]: snapshot[name] + amount, updatedAt: now };
}

export function averageSteps(snapshot: AgentMetricSnapshot): number {
  const runs = snapshot.runsCompleted + snapshot.runsFailed + snapshot.runsCancelled + snapshot.runsExpired;
  if (runs === 0) return 0;
  return Number((snapshot.totalSteps / runs).toFixed(2));
}

export function metricDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

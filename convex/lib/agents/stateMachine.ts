import { LEASE_MS } from "./config";
import type { AgentRunRecord, AgentState } from "./types";

const TRANSITIONS: Record<AgentState, readonly AgentState[]> = {
  created: ["planning", "cancelled", "failed", "expired"],
  planning: ["running", "planning", "waiting_for_approval", "completed", "failed", "cancelled", "expired"],
  running: ["running", "planning", "waiting_for_approval", "completed", "failed", "cancelled", "expired"],
  waiting_for_approval: ["resuming", "cancelled", "expired", "failed", "completed"],
  resuming: ["running", "completed", "failed", "cancelled", "expired"],
  completed: [],
  failed: [],
  cancelled: [],
  expired: [],
};

export function isTerminal(status: AgentState): boolean {
  return TRANSITIONS[status].length === 0;
}

export function canTransition(from: AgentState, to: AgentState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: AgentState, to: AgentState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid agent transition: ${from} -> ${to}`);
  }
}

export function transition(run: AgentRunRecord, to: AgentState, now: number): AgentRunRecord {
  assertTransition(run.status, to);
  const terminal = isTerminal(to);
  return {
    ...run,
    status: to,
    updatedAt: now,
    completedAt: terminal ? now : run.completedAt,
    version: run.version + 1,
    leaseOwner: undefined,
    leaseUntil: undefined,
  };
}

export type LeaseClaim =
  | {
      ok: true;
      status: AgentState;
      version: number;
      leaseOwner: string;
      leaseUntil: number;
    }
  | { ok: false; reason: "terminal" | "leased" | "waiting" | "expired" };

export function claimLease(
  input: {
    status: AgentState;
    version: number;
    leaseOwner?: string;
    leaseUntil?: number;
    expiresAt: number;
  },
  owner: string,
  now: number,
  leaseMs = LEASE_MS
): LeaseClaim {
  if (now >= input.expiresAt) return { ok: false, reason: "expired" };
  if (isTerminal(input.status)) return { ok: false, reason: "terminal" };
  if (input.status === "waiting_for_approval") return { ok: false, reason: "waiting" };
  if (
    input.leaseOwner &&
    input.leaseOwner !== owner &&
    input.leaseUntil !== undefined &&
    input.leaseUntil > now
  ) {
    return { ok: false, reason: "leased" };
  }
  const status = input.status === "created" ? "planning" : input.status;
  if (!canTransition(input.status, status) && input.status !== status) {
    return { ok: false, reason: "terminal" };
  }
  return {
    ok: true,
    status,
    version: input.version + 1,
    leaseOwner: owner,
    leaseUntil: now + leaseMs,
  };
}

export function requestCancellation(run: AgentRunRecord, now: number): AgentRunRecord {
  if (isTerminal(run.status)) return run;
  return {
    ...transition(run, "cancelled", now),
    failureReason: "Cancelled by an admin",
    errorCategory: "cancelled",
    approvalStatus: run.approvalStatus === "pending" ? "cancelled" : run.approvalStatus,
    approvals: run.approvals.map((approval) =>
      approval.executionStatus !== "executed"
        ? { ...approval, status: "cancelled", decidedAt: now, executionStatus: "skipped" }
        : approval
    ),
  };
}

export function expireRun(run: AgentRunRecord, now: number): AgentRunRecord {
  if (isTerminal(run.status)) return run;
  return {
    ...transition(run, "expired", now),
    failureReason: "The agent run expired before it finished",
    errorCategory: "expired",
    approvals: run.approvals.map((approval) =>
      approval.status === "pending"
        ? { ...approval, status: "expired", decidedAt: now, executionStatus: "skipped" }
        : approval
    ),
    approvalStatus: run.approvalStatus === "pending" ? "expired" : run.approvalStatus,
  };
}

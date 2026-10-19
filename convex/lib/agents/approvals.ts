import { APPROVAL_TTL_MS } from "./config";
import { stableHash } from "./security";
import type { ApprovalRecord, ApprovalState } from "./types";

export function approvalHash(args: Record<string, unknown>): string {
  return stableHash(args);
}

export function createPendingApproval(input: {
  id: string;
  stepIndex: number;
  toolName: string;
  args: Record<string, unknown>;
  summary: string;
  requestedBy: string;
  now: number;
}): ApprovalRecord {
  return {
    id: input.id,
    stepIndex: input.stepIndex,
    toolName: input.toolName,
    arguments: input.args,
    argumentsHash: approvalHash(input.args),
    summary: input.summary,
    risk: "draft_writing",
    status: "pending",
    requestedBy: input.requestedBy,
    createdAt: input.now,
    expiresAt: input.now + APPROVAL_TTL_MS,
    idempotencyKey: `${input.id}:write`,
    executionStatus: "pending",
  };
}

export function argumentsMatchApproval(
  approval: ApprovalRecord,
  toolName: string,
  args: Record<string, unknown>
): boolean {
  return (
    approval.toolName === toolName &&
    approval.argumentsHash === approvalHash(approval.arguments) &&
    approval.argumentsHash === approvalHash(args)
  );
}

export function decideApproval(input: {
  approval: ApprovalRecord;
  decision: "approved" | "rejected";
  actorId: string;
  actorIsAdmin: boolean;
  now: number;
}): { ok: true; approval: ApprovalRecord } | { ok: false; error: string; approval: ApprovalRecord } {
  if (!input.actorIsAdmin || !input.actorId) {
    return { ok: false, error: "unauthorized", approval: input.approval };
  }
  if (input.approval.status !== "pending") {
    return { ok: false, error: "approval_replay", approval: input.approval };
  }
  if (input.now >= input.approval.expiresAt) {
    return {
      ok: false,
      error: "approval_expired",
      approval: {
        ...input.approval,
        status: "expired",
        decidedAt: input.now,
        executionStatus: "skipped",
      },
    };
  }
  if (input.approval.argumentsHash !== approvalHash(input.approval.arguments)) {
    return { ok: false, error: "arguments_changed", approval: input.approval };
  }
  const status: ApprovalState = input.decision;
  return {
    ok: true,
    approval: {
      ...input.approval,
      status,
      decidedBy: input.actorId,
      decidedAt: input.now,
      executionStatus: input.decision === "rejected" ? "skipped" : "pending",
    },
  };
}

export function assertDraftExecutionAllowed(input: {
  approval: ApprovalRecord | undefined;
  toolName: string;
  args: Record<string, unknown>;
  draftWritesEnabled: boolean;
  now: number;
}): { ok: true } | { ok: false; error: string } {
  if (!input.draftWritesEnabled) return { ok: false, error: "draft_writes_disabled" };
  const approval = input.approval;
  if (!approval) return { ok: false, error: "approval_required" };
  if (approval.status !== "approved") return { ok: false, error: "approval_required" };
  if (approval.executionStatus === "executed") return { ok: false, error: "duplicate_write" };
  if (input.now >= approval.expiresAt) return { ok: false, error: "approval_expired" };
  if (!argumentsMatchApproval(approval, input.toolName, input.args)) {
    return { ok: false, error: "arguments_changed" };
  }
  return { ok: true };
}

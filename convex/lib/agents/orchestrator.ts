import { boundText, sanitizeUntrustedText } from "./security";
import { assertDraftExecutionAllowed, createPendingApproval, decideApproval } from "./approvals";
import { expireRun, isTerminal, requestCancellation, transition } from "./stateMachine";
import { executeRegisteredTool, getTool } from "./tools";
import { DEFAULT_MAX_PLANNER_CALLS, DEFAULT_MAX_REPLANS, DEFAULT_MAX_TOOL_CALLS, RUN_RETENTION_MS } from "./config";
import type {
  AgentLimits,
  AgentReport,
  AgentRunRecord,
  AgentStepRecord,
  FactType,
  Planner,
  ToolHandler,
} from "./types";

export function createAgentRun(input: {
  id?: string;
  adminUserId?: string;
  request: string;
  now?: number;
  limits?: Partial<AgentLimits>;
  requireDraftApproval?: boolean;
  draftWritesEnabled?: boolean;
}): AgentRunRecord {
  const now = input.now ?? 1_700_000_000_000;
  const summary = boundText(input.request, 160);
  return {
    id: input.id ?? "run_1",
    adminUserId: input.adminUserId ?? "admin_1",
    request: input.request,
    requestSummary: summary,
    status: "created",
    planSummary: "",
    stepIndex: 0,
    toolCallCount: 0,
    plannerCalls: 0,
    replanCount: 0,
    steps: [],
    approvals: [],
    recommendations: [],
    approvalStatus: "none",
    version: 1,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + RUN_RETENTION_MS,
    limits: {
      maxToolCalls: input.limits?.maxToolCalls ?? DEFAULT_MAX_TOOL_CALLS,
      maxPlannerCalls: input.limits?.maxPlannerCalls ?? DEFAULT_MAX_PLANNER_CALLS,
      maxReplans: input.limits?.maxReplans ?? DEFAULT_MAX_REPLANS,
    },
    requireDraftApproval: input.requireDraftApproval ?? true,
    draftWritesEnabled: input.draftWritesEnabled ?? true,
  };
}

export type AdvanceResult = {
  run: AgentRunRecord;
  continue: boolean;
  metric?:
    | "tool_success"
    | "tool_failure"
    | "approval_request"
    | "completed"
    | "failed"
    | "cancelled"
    | "expired"
    | "provider_failure";
};

export function buildReport(run: AgentRunRecord): AgentReport {
  const completedSteps = run.steps
    .filter((step) => step.kind === "tool" && step.status === "succeeded")
    .map((step) => ({ tool: step.toolName ?? "tool", summary: step.summary }));
  const skippedSteps = run.steps
    .filter((step) => step.status === "skipped" || step.factType === "unavailable")
    .map((step) => ({ tool: step.toolName ?? "tool", reason: step.summary }));
  const toolEvidence = run.steps
    .filter((step) => step.kind === "tool" && step.summary)
    .map((step) => ({
      tool: step.toolName ?? "tool",
      summary: step.summary,
      factType: step.factType ?? "verified",
    }));
  const draftLinks = run.steps.flatMap((step) => {
    const result = step.result;
    if (!result || typeof result !== "object") return [];
    const record = result as Record<string, unknown>;
    if (typeof record.url !== "string" || typeof record.title !== "string") return [];
    return [{ label: record.title, href: record.url }];
  });
  const limitations = skippedSteps.map((step) => `${step.tool}: ${step.reason}`);
  if (run.failureReason) limitations.push(run.failureReason);
  return {
    runId: run.id,
    status: run.status,
    userRequestSummary: run.requestSummary,
    completedSteps,
    skippedSteps,
    toolEvidence,
    businessInsights: toolEvidence
      .filter((item) => item.factType === "verified" || item.factType === "estimate")
      .map((item) => item.summary),
    recommendations: run.recommendations.map(
      (item) => `AI recommendation: ${item}`
    ),
    draftLinks,
    pendingApprovals: run.approvals
      .filter((approval) => approval.status === "pending")
      .map((approval) => ({
        id: approval.id,
        summary: approval.summary,
        expiresAt: approval.expiresAt,
      })),
    limitations,
    errorCategory: run.errorCategory,
  };
}

function observations(run: AgentRunRecord) {
  return run.steps
    .filter((step) => step.kind === "tool")
    .map((step) => ({
      tool: step.toolName ?? "tool",
      summary: step.summary,
      unavailable: step.factType === "unavailable" || step.status === "skipped",
    }));
}

function pushStep(run: AgentRunRecord, step: AgentStepRecord): AgentRunRecord {
  return {
    ...run,
    steps: [...run.steps, step],
    stepIndex: step.stepIndex + 1,
  };
}

function finish(run: AgentRunRecord, now: number, metric: AdvanceResult["metric"]): AdvanceResult {
  const next = transition(run, "completed", now);
  const withReport = { ...next, report: buildReport({ ...next, status: "completed" }) };
  return { run: { ...withReport, report: buildReport(withReport) }, continue: false, metric };
}

function fail(
  run: AgentRunRecord,
  now: number,
  errorCategory: string,
  failureReason: string,
  metric: AdvanceResult["metric"] = "failed"
): AdvanceResult {
  const next = {
    ...transition(run, "failed", now),
    errorCategory,
    failureReason,
  };
  return {
    run: { ...next, report: buildReport(next) },
    continue: false,
    metric: errorCategory === "provider_failure" ? "provider_failure" : metric,
  };
}

export async function advanceAgent(
  run: AgentRunRecord,
  deps: {
    now: number;
    planner: Planner;
    handlers: Partial<Record<string, ToolHandler>>;
    actorRole: "admin" | "customer";
    backoffMs?: number;
  }
): Promise<AdvanceResult> {
  if (run.status === "cancelled") {
    return { run, continue: false, metric: "cancelled" };
  }
  if (isTerminal(run.status)) return { run, continue: false };
  if (deps.now >= run.expiresAt) {
    const expired = expireRun(run, deps.now);
    return { run: { ...expired, report: buildReport(expired) }, continue: false, metric: "expired" };
  }
  if (deps.actorRole !== "admin") {
    return fail(run, deps.now, "unauthorized", "Admin permission is required");
  }
  if (run.status === "waiting_for_approval") {
    const pending = run.approvals.find((approval) => approval.status === "pending");
    if (pending && deps.now >= pending.expiresAt) {
      const expired = expireRun(run, deps.now);
      return { run: { ...expired, report: buildReport(expired) }, continue: false, metric: "expired" };
    }
    return { run, continue: false };
  }

  if (run.status === "resuming") {
    return await resumeApprovedWrite(run, deps);
  }

  if (run.plannerCalls >= run.limits.maxPlannerCalls) {
    return fail(run, deps.now, "limit_exceeded", "The agent reached its planning limit");
  }

  let working = run.status === "created" ? transition(run, "planning", deps.now) : run;
  working = { ...working, plannerCalls: working.plannerCalls + 1, updatedAt: deps.now };

  let decision;
  try {
    decision = await deps.planner({
      request: working.request,
      planSummary: working.planSummary,
      observations: observations(working),
      toolCallCount: working.toolCallCount,
      replanCount: working.replanCount,
      limits: working.limits,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider failed";
    return fail(working, deps.now, "provider_failure", sanitizeUntrustedText(message, 240).text);
  }

  if (decision.kind === "provider_failure") {
    return fail(working, deps.now, "provider_failure", sanitizeUntrustedText(decision.message, 240).text);
  }

  if (decision.kind === "replan") {
    if (working.replanCount >= working.limits.maxReplans) {
      return fail(working, deps.now, "limit_exceeded", "The agent reached its replanning limit");
    }
    const summary = sanitizeUntrustedText(decision.summary, 400).text;
    const next = transition(
      { ...working, planSummary: summary || working.planSummary, replanCount: working.replanCount + 1 },
      "planning",
      deps.now
    );
    return { run: next, continue: true };
  }

  if (decision.kind === "finish") {
    const recommendations = decision.recommendations
      .slice(0, 5)
      .map((item) => sanitizeUntrustedText(item, 240).text)
      .filter(Boolean);
    const next = { ...working, recommendations };
    return finish(next, deps.now, "completed");
  }

  if (working.toolCallCount >= working.limits.maxToolCalls) {
    return fail(working, deps.now, "limit_exceeded", "The agent reached its tool-call limit");
  }

  const tool = getTool(decision.tool);
  if (tool?.risk === "draft_writing") {
    const gated = await prepareDraftWrite(working, decision, deps);
    if (gated) return gated;
  }

  return await runTool(working, decision, deps);
}

async function prepareDraftWrite(
  run: AgentRunRecord,
  decision: { tool: string; arguments: Record<string, unknown>; summary: string },
  deps: { now: number; handlers: Partial<Record<string, ToolHandler>>; backoffMs?: number }
): Promise<AdvanceResult | undefined> {
  if (!run.draftWritesEnabled) {
    return await runTool(run, decision, {
      now: deps.now,
      backoffMs: deps.backoffMs,
      handlers: {
        ...deps.handlers,
        create_marketing_campaign_draft: async () => ({
          available: false,
          reason: "draft_writes_disabled",
          summary: "Draft creation is disabled",
        }),
      },
    });
  }
  if (!run.requireDraftApproval) {
    return undefined;
  }
  const existing = [...run.approvals].reverse().find((approval) => approval.toolName === decision.tool);
  if (existing?.status === "approved" && existing.executionStatus === "pending") {
    return await resumeApprovedWrite(run, {
      now: deps.now,
      planner: async () => ({ kind: "finish", recommendations: [] }),
      handlers: deps.handlers,
      backoffMs: deps.backoffMs,
    });
  }
  if (existing?.status === "rejected") {
    const next = {
      ...run,
      recommendations: run.recommendations,
      failureReason: undefined,
    };
    const reported = {
      ...transition(next, "completed", deps.now),
      limitationsNote: "approval_rejected",
      errorCategory: undefined,
      steps: [
        ...next.steps,
        {
          stepIndex: next.stepIndex,
          kind: "approval" as const,
          toolName: decision.tool,
          status: "skipped" as const,
          summary: "Draft was not saved because the approval was rejected",
          factType: "unavailable" as FactType,
        },
      ],
    };
    return { run: { ...reported, report: buildReport(reported) }, continue: false, metric: "completed" };
  }
  const preview = await executeRegisteredTool({
    name: decision.tool,
    args: decision.arguments,
    role: "admin",
    context: { runId: run.id, idempotencyKey: "validate-only", adminUserId: run.adminUserId },
    handlers: {
      create_marketing_campaign_draft: async () => ({ available: true, validated: true }),
    },
    timeoutMs: 1_000,
    backoffMs: 0,
  });
  if (!preview.ok) {
    return await runTool(run, decision, {
      now: deps.now,
      handlers: deps.handlers,
      backoffMs: deps.backoffMs,
    });
  }
  const approval = createPendingApproval({
    id: `${run.id}:${run.stepIndex}`,
    stepIndex: run.stepIndex,
    toolName: decision.tool,
    args: preview.arguments,
    summary: boundText(decision.summary || "Save a marketing campaign draft", 400),
    requestedBy: run.adminUserId,
    now: deps.now,
  });
  const waiting = transition(
    {
      ...run,
      approvals: [...run.approvals, approval],
      approvalStatus: "pending",
      planSummary: approval.summary,
      toolCallCount: run.toolCallCount + 1,
    },
    "waiting_for_approval",
    deps.now
  );
  const withStep = pushStep(waiting, {
    stepIndex: run.stepIndex,
    kind: "approval",
    toolName: decision.tool,
    arguments: preview.arguments,
    status: "pending",
    summary: approval.summary,
    risk: "draft_writing",
    idempotencyKey: approval.idempotencyKey,
  });
  return {
    run: { ...withStep, report: buildReport(withStep) },
    continue: false,
    metric: "approval_request",
  };
}

async function resumeApprovedWrite(
  run: AgentRunRecord,
  deps: {
    now: number;
    planner: Planner;
    handlers: Partial<Record<string, ToolHandler>>;
    backoffMs?: number;
  }
): Promise<AdvanceResult> {
  const approval = [...run.approvals].reverse().find((item) => item.status === "approved");
  if (!approval) {
    return fail(run, deps.now, "approval_required", "No approved action is available to resume");
  }
  if (run.steps.some((step) => step.idempotencyKey === approval.idempotencyKey && step.status === "succeeded")) {
    const running = transition(run, "running", deps.now);
    return { run: running, continue: true };
  }
  const allowed = assertDraftExecutionAllowed({
    approval,
    toolName: approval.toolName,
    args: approval.arguments,
    draftWritesEnabled: run.draftWritesEnabled,
    now: deps.now,
  });
  if (!allowed.ok) {
    if (allowed.error === "duplicate_write") {
      const running = transition(run, "running", deps.now);
      return { run: running, continue: true };
    }
    return fail(run, deps.now, allowed.error, "The approved draft could not be saved");
  }
  const executed = await executeRegisteredTool({
    name: approval.toolName,
    args: approval.arguments,
    role: "admin",
    context: {
      runId: run.id,
      idempotencyKey: approval.idempotencyKey,
      adminUserId: run.adminUserId,
    },
    handlers: deps.handlers,
    backoffMs: deps.backoffMs,
  });
  if (!executed.ok) {
    return fail(run, deps.now, executed.errorCategory, executed.summary, "tool_failure");
  }
  const approvals = run.approvals.map((item) =>
    item.id === approval.id
      ? {
          ...item,
          executionStatus: "executed" as const,
          draftId:
            executed.result && typeof executed.result === "object"
              ? String((executed.result as Record<string, unknown>).draftId ?? "")
              : undefined,
          draftUrl:
            executed.result && typeof executed.result === "object"
              ? String((executed.result as Record<string, unknown>).url ?? "")
              : undefined,
        }
      : item
  );
  const stepped = pushStep(
    {
      ...run,
      approvals,
      approvalStatus: "approved",
      toolCallCount: run.toolCallCount + 1,
    },
    {
      stepIndex: run.stepIndex,
      kind: "tool",
      toolName: approval.toolName,
      arguments: approval.arguments,
      result: executed.result,
      status: executed.skipped ? "skipped" : "succeeded",
      summary: executed.summary,
      risk: executed.risk,
      durationMs: executed.durationMs,
      idempotencyKey: approval.idempotencyKey,
      factType: executed.factType,
    }
  );
  const running = transition(stepped, "running", deps.now);
  return { run: running, continue: true, metric: "tool_success" };
}

async function runTool(
  run: AgentRunRecord,
  decision: { tool: string; arguments: Record<string, unknown>; summary: string },
  deps: {
    now: number;
    handlers: Partial<Record<string, ToolHandler>>;
    backoffMs?: number;
  }
): Promise<AdvanceResult> {
  const idempotencyKey = `${run.id}:tool:${run.toolCallCount}`;
  if (run.steps.some((step) => step.idempotencyKey === idempotencyKey)) {
    const running = run.status === "running" ? run : transition(run, "running", deps.now);
    return { run: running, continue: true };
  }
  const executed = await executeRegisteredTool({
    name: decision.tool,
    args: decision.arguments,
    role: "admin",
    context: { runId: run.id, idempotencyKey, adminUserId: run.adminUserId },
    handlers: deps.handlers,
    backoffMs: deps.backoffMs,
  });
  const base = {
    ...run,
    toolCallCount: run.toolCallCount + 1,
    planSummary: boundText(decision.summary || run.planSummary, 400),
  };
  if (!executed.ok) {
    const stepped = pushStep(base, {
      stepIndex: run.stepIndex,
      kind: "tool",
      toolName: decision.tool,
      arguments: executed.arguments,
      status: "failed",
      summary: executed.summary,
      risk: executed.risk,
      durationMs: executed.durationMs,
      errorCategory: executed.errorCategory,
      idempotencyKey,
      factType: "unavailable",
    });
    const running = stepped.status === "running" ? stepped : transition(stepped, "running", deps.now);
    return { run: running, continue: true, metric: "tool_failure" };
  }
  const stepped = pushStep(base, {
    stepIndex: run.stepIndex,
    kind: "tool",
    toolName: decision.tool,
    arguments: executed.arguments,
    result: executed.result,
    status: executed.skipped ? "skipped" : "succeeded",
    summary: executed.summary,
    risk: executed.risk,
    durationMs: executed.durationMs,
    idempotencyKey,
    factType: executed.factType,
  });
  const running = stepped.status === "running" ? stepped : transition(stepped, "running", deps.now);
  return { run: running, continue: true, metric: "tool_success" };
}

export function cancelAgent(run: AgentRunRecord, now: number): AgentRunRecord {
  const cancelled = requestCancellation(run, now);
  return { ...cancelled, report: buildReport(cancelled) };
}

export function applyApprovalDecision(
  run: AgentRunRecord,
  input: {
    approvalId: string;
    decision: "approved" | "rejected";
    actorId: string;
    actorIsAdmin: boolean;
    now: number;
  }
): { ok: boolean; error?: string; run: AgentRunRecord } {
  const current = run.approvals.find((approval) => approval.id === input.approvalId);
  if (!current) return { ok: false, error: "approval_required", run };
  const decision = decideApproval({
    approval: current,
    decision: input.decision,
    actorId: input.actorId,
    actorIsAdmin: input.actorIsAdmin,
    now: input.now,
  });
  const approvals = run.approvals.map((approval) =>
    approval.id === current.id ? decision.approval : approval
  );
  if (!decision.ok && decision.error === "approval_expired") {
    const expired = expireRun({ ...run, approvals, approvalStatus: "expired" }, input.now);
    return { ok: false, error: "approval_expired", run: { ...expired, report: buildReport(expired) } };
  }
  if (!decision.ok) return { ok: false, error: decision.error, run };
  if (decision.approval.status === "rejected") {
    const completed = transition(
      { ...run, approvals, approvalStatus: "rejected" },
      "completed",
      input.now
    );
    const withStep = pushStep(completed, {
      stepIndex: completed.stepIndex,
      kind: "approval",
      toolName: current.toolName,
      status: "skipped",
      summary: "Draft was not saved because an admin rejected it",
      factType: "unavailable",
    });
    return { ok: true, run: { ...withStep, report: buildReport(withStep) } };
  }
  const resuming = transition(
    { ...run, approvals, approvalStatus: "approved" },
    "resuming",
    input.now
  );
  return { ok: true, run: resuming };
}

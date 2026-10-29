import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api";
import { mutation, query } from "./server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireAdmin } from "./lib/requireAdmin";
import {
  AGENT_MAX_TOOL_CALLS_KEY,
  AGENT_REQUIRE_DRAFT_APPROVAL_KEY,
  AGENTIC_AI_DRAFT_WRITES_ENV,
  AGENTIC_AI_ENV,
  ENABLE_AGENT_DRAFT_CREATION_KEY,
  ENABLE_AGENTIC_AI_KEY,
  MAX_CONCURRENT_RUNS,
  MAX_QUESTION_LENGTH,
  RUN_RETENTION_MS,
  agentRunGate,
  deploymentGateEnabled,
  draftApprovalRequired,
  draftWriteGate,
  llmChainConfigured,
  parseAgentEnabled,
  parseMaxToolCalls,
} from "./lib/agents/config";
import { canAccessRun } from "./lib/agents/panel";
import { applyApprovalDecision, cancelAgent } from "./lib/agents/orchestrator";
import { stableHash } from "./lib/agents/security";
import { agentStateValidator } from "./lib/agents/validators";
import { bumpAgentMetric, countActiveRuns, readRunRecord } from "./agentInternal";
import type { Id } from "./_generated/dataModel";

async function settingValue(ctx: QueryCtx | MutationCtx, key: string, fallback: string) {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  return row?.value ?? fallback;
}

export const availability = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const enabledSetting = parseAgentEnabled(
      await settingValue(ctx, ENABLE_AGENTIC_AI_KEY, "false")
    );
    const draftSetting = parseAgentEnabled(
      await settingValue(ctx, ENABLE_AGENT_DRAFT_CREATION_KEY, "false")
    );
    const approvalSetting = await settingValue(ctx, AGENT_REQUIRE_DRAFT_APPROVAL_KEY, "true");
    const gate = agentRunGate({
      adminEnabled: enabledSetting,
      deploymentGate: deploymentGateEnabled(process.env[AGENTIC_AI_ENV]),
      providerConfigured: llmChainConfigured(),
    });
    const drafts = draftWriteGate({
      adminEnabled: draftSetting,
      deploymentGate: deploymentGateEnabled(process.env[AGENTIC_AI_DRAFT_WRITES_ENV]),
    });
    return {
      enabled: gate.enabled,
      reason: gate.reason,
      draftWritesEnabled: drafts.enabled,
      approvalRequired: draftApprovalRequired(approvalSetting),
      maxToolCalls: parseMaxToolCalls(await settingValue(ctx, AGENT_MAX_TOOL_CALLS_KEY, "8")),
    };
  },
});

export const listRuns = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const page = await ctx.db
      .query("agentRuns")
      .withIndex("by_admin_created", (q) => q.eq("adminUserId", admin._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...page,
      page: page.page.map((run) => ({
        _id: run._id,
        requestSummary: run.requestSummary,
        status: run.status,
        approvalStatus: run.approvalStatus,
        toolCallCount: run.toolCallCount,
        failureReason: run.failureReason,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        completedAt: run.completedAt,
        durationMs: (run.completedAt ?? run.updatedAt) - run.createdAt,
      })),
    };
  },
});

export const getRun = query({
  args: { runId: v.id("agentRuns") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const run = await ctx.db.get(args.runId);
    if (!run || !canAccessRun(run.adminUserId, admin._id)) return null;
    const record = await readRunRecord(ctx, args.runId);
    if (!record) return null;
    return {
      _id: args.runId,
      status: record.status,
      requestSummary: record.requestSummary,
      planSummary: record.planSummary,
      approvalStatus: record.approvalStatus,
      toolCallCount: record.toolCallCount,
      failureReason: record.failureReason,
      errorCategory: record.errorCategory,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      completedAt: record.completedAt,
      steps: record.steps.map((step) => ({
        stepIndex: step.stepIndex,
        kind: step.kind,
        toolName: step.toolName,
        status: step.status,
        summary: step.summary,
        factType: step.factType,
        errorCategory: step.errorCategory,
      })),
      approvals: record.approvals.map((approval) => ({
        id: approval.id,
        summary: approval.summary,
        arguments: approval.arguments,
        status: approval.status,
        risk: approval.risk,
        expiresAt: approval.expiresAt,
        draftUrl: approval.draftUrl,
      })),
      report: record.report ?? null,
    };
  },
});

export const metrics = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("agentMetrics").withIndex("by_day").order("desc").take(14);
  },
});

export const startRun = mutation({
  args: { request: v.string(), idempotencyKey: v.optional(v.string()) },
  returns: v.id("agentRuns"),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const request = args.request.trim();
    if (!request) throw new ConvexError("Please enter a request.");
    if (request.length > MAX_QUESTION_LENGTH) {
      throw new ConvexError(`Request is too long. Maximum ${MAX_QUESTION_LENGTH} characters.`);
    }
    const enabledSetting = parseAgentEnabled(await settingValue(ctx, ENABLE_AGENTIC_AI_KEY, "false"));
    const gate = agentRunGate({
      adminEnabled: enabledSetting,
      deploymentGate: deploymentGateEnabled(process.env[AGENTIC_AI_ENV]),
      providerConfigured: llmChainConfigured(),
    });
    if (!gate.enabled) throw new ConvexError(`Agentic AI is unavailable (${gate.reason}).`);
    const idempotencyKey = args.idempotencyKey?.trim() || `agent:${admin._id}:${stableHash(request)}:${Date.now()}`;
    const existing = await ctx.db
      .query("agentRuns")
      .withIndex("by_idempotency", (q) => q.eq("idempotencyKey", idempotencyKey))
      .unique();
    if (existing) {
      if (existing.adminUserId !== admin._id) throw new ConvexError("Agent run not found");
      return existing._id;
    }
    if ((await countActiveRuns(ctx, admin._id)) >= MAX_CONCURRENT_RUNS) {
      throw new ConvexError("Too many agent runs are already active.");
    }
    const draftSetting = parseAgentEnabled(
      await settingValue(ctx, ENABLE_AGENT_DRAFT_CREATION_KEY, "false")
    );
    const drafts = draftWriteGate({
      adminEnabled: draftSetting,
      deploymentGate: deploymentGateEnabled(process.env[AGENTIC_AI_DRAFT_WRITES_ENV]),
    });
    const now = Date.now();
    const runId = await ctx.db.insert("agentRuns", {
      adminUserId: admin._id,
      adminName: admin.name || admin.email || "Admin",
      request: request.slice(0, MAX_QUESTION_LENGTH),
      requestSummary: request.slice(0, 160),
      status: "created",
      planSummary: "",
      stepIndex: 0,
      toolCallCount: 0,
      plannerCalls: 0,
      replanCount: 0,
      approvalStatus: "none",
      recommendationsJson: "[]",
      version: 1,
      idempotencyKey,
      maxToolCalls: parseMaxToolCalls(await settingValue(ctx, AGENT_MAX_TOOL_CALLS_KEY, "8")),
      requireDraftApproval: draftApprovalRequired(
        await settingValue(ctx, AGENT_REQUIRE_DRAFT_APPROVAL_KEY, "true")
      ),
      draftWritesEnabled: drafts.enabled,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + RUN_RETENTION_MS,
    });
    await ctx.db.insert("agentAuditLogs", {
      runId,
      adminUserId: admin._id,
      action: "run_started",
      summary: request.slice(0, 300),
      createdAt: now,
    });
    await bumpAgentMetric(ctx, "runsStarted", now);
    await ctx.scheduler.runAfter(0, internal.agentActions.advance, { runId });
    return runId;
  },
});

async function ownedRun(ctx: QueryCtx | MutationCtx, runId: Id<"agentRuns">, adminId: string) {
  const run = await ctx.db.get(runId);
  if (!run || !canAccessRun(run.adminUserId, adminId)) throw new ConvexError("Agent run not found");
  return run;
}

export const approve = mutation({
  args: { runId: v.id("agentRuns"), approvalId: v.string() },
  returns: agentStateValidator,
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    await ownedRun(ctx, args.runId, admin._id);
    const record = await readRunRecord(ctx, args.runId);
    if (!record) throw new ConvexError("Agent run not found");
    const decision = applyApprovalDecision(record, {
      approvalId: args.approvalId,
      decision: "approved",
      actorId: admin._id,
      actorIsAdmin: true,
      now: Date.now(),
    });
    if (!decision.ok) throw new ConvexError(decision.error ?? "Approval failed");
    await persistDecision(ctx, args.runId, decision.run, "approval_granted");
    await bumpAgentMetric(ctx, "approvalDecisions", Date.now());
    await ctx.scheduler.runAfter(0, internal.agentActions.advance, { runId: args.runId });
    return decision.run.status;
  },
});

export const reject = mutation({
  args: { runId: v.id("agentRuns"), approvalId: v.string() },
  returns: agentStateValidator,
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    await ownedRun(ctx, args.runId, admin._id);
    const record = await readRunRecord(ctx, args.runId);
    if (!record) throw new ConvexError("Agent run not found");
    const decision = applyApprovalDecision(record, {
      approvalId: args.approvalId,
      decision: "rejected",
      actorId: admin._id,
      actorIsAdmin: true,
      now: Date.now(),
    });
    if (!decision.ok) throw new ConvexError(decision.error ?? "Rejection failed");
    await persistDecision(ctx, args.runId, decision.run, "approval_rejected");
    await bumpAgentMetric(ctx, "approvalDecisions", Date.now());
    return decision.run.status;
  },
});

export const cancel = mutation({
  args: { runId: v.id("agentRuns") },
  returns: agentStateValidator,
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    await ownedRun(ctx, args.runId, admin._id);
    const record = await readRunRecord(ctx, args.runId);
    if (!record) throw new ConvexError("Agent run not found");
    const cancelled = cancelAgent(record, Date.now());
    await persistDecision(ctx, args.runId, cancelled, "run_cancelled");
    if (cancelled.status === "cancelled" && record.status !== "cancelled") {
      await bumpAgentMetric(ctx, "runsCancelled", Date.now());
    }
    return cancelled.status;
  },
});

async function persistDecision(
  ctx: MutationCtx,
  runId: Id<"agentRuns">,
  run: NonNullable<Awaited<ReturnType<typeof readRunRecord>>>,
  action: string
) {
  const current = await ctx.db.get(runId);
  if (!current) return;
  await ctx.db.patch(runId, {
    status: run.status,
    planSummary: run.planSummary,
    stepIndex: run.stepIndex,
    approvalStatus: run.approvalStatus,
    failureReason: run.failureReason,
    errorCategory: run.errorCategory,
    reportJson: run.report ? JSON.stringify(run.report) : undefined,
    completedAt: run.completedAt,
    recommendationsJson: JSON.stringify(run.recommendations),
    version: current.version + 1,
    leaseOwner: undefined,
    leaseUntil: undefined,
    updatedAt: run.updatedAt,
  });
  const stored = await ctx.db
    .query("agentApprovals")
    .withIndex("by_run", (q) => q.eq("runId", runId))
    .take(10);
  for (const approval of run.approvals) {
    const match = stored.find((row) => row.approvalKey === approval.id);
    if (!match) continue;
    await ctx.db.patch(match._id, {
      status: approval.status,
      executionStatus: approval.executionStatus,
      decidedBy: approval.decidedBy,
      decidedAt: approval.decidedAt,
    });
  }
  await ctx.db.insert("agentAuditLogs", {
    runId,
    adminUserId: current.adminUserId,
    action,
    summary: (run.failureReason ?? run.planSummary) || action,
    createdAt: run.updatedAt,
  });
}

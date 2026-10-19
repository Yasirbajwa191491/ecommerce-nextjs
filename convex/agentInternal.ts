import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { claimLease } from "./lib/agents/stateMachine";
import { assertDraftExecutionAllowed } from "./lib/agents/approvals";
import {
  AUDIT_RETENTION_MS,
  LEASE_MS,
} from "./lib/agents/config";
import { bumpMetric, emptyMetrics, metricDay, type MetricName } from "./lib/agents/monitoring";
import { safeErrorMessage } from "./lib/agents/security";
import type { AgentRunRecord, AgentState, ApprovalRecord, AgentStepRecord } from "./lib/agents/types";
import { isTerminal } from "./lib/agents/stateMachine";

const ACTIVE_STATUSES: AgentState[] = [
  "created",
  "planning",
  "running",
  "waiting_for_approval",
  "resuming",
];

function parseObject(value: string | undefined): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function countActiveRuns(ctx: QueryCtx | MutationCtx, adminUserId: string): Promise<number> {
  let count = 0;
  for (const status of ACTIVE_STATUSES) {
    const rows = await ctx.db
      .query("agentRuns")
      .withIndex("by_admin_status", (q) => q.eq("adminUserId", adminUserId).eq("status", status))
      .take(4);
    count += rows.length;
  }
  return count;
}

export async function readRunRecord(
  ctx: QueryCtx | MutationCtx,
  runId: Id<"agentRuns">
): Promise<AgentRunRecord | null> {
  const run = await ctx.db.get(runId);
  if (!run) return null;
  const steps = await ctx.db
    .query("agentSteps")
    .withIndex("by_run", (q) => q.eq("runId", runId))
    .take(40);
  const approvals = await ctx.db
    .query("agentApprovals")
    .withIndex("by_run", (q) => q.eq("runId", runId))
    .take(10);
  const stepRecords: AgentStepRecord[] = steps
    .sort((a, b) => a.stepIndex - b.stepIndex)
    .map((step) => ({
      stepIndex: step.stepIndex,
      kind: step.kind,
      toolName: step.toolName,
      arguments: parseObject(step.argumentsJson),
      result: step.resultJson ? parseObject(step.resultJson) ?? step.resultJson : undefined,
      status: step.status,
      summary: step.summary,
      risk: step.risk === "read_only" || step.risk === "draft_writing" ? step.risk : undefined,
      durationMs: step.durationMs,
      errorCategory: step.errorCategory,
      idempotencyKey: step.idempotencyKey,
      factType:
        step.factType === "verified" ||
        step.factType === "estimate" ||
        step.factType === "unavailable" ||
        step.factType === "recommendation"
          ? step.factType
          : undefined,
    }));
  const approvalRecords: ApprovalRecord[] = approvals.map((approval) => ({
    id: approval.approvalKey,
    stepIndex: approval.stepIndex,
    toolName: approval.toolName,
    arguments: parseObject(approval.argumentsJson) ?? {},
    argumentsHash: approval.argumentsHash,
    summary: approval.summary,
    risk: "draft_writing",
    status: approval.status,
    requestedBy: approval.requestedBy,
    decidedBy: approval.decidedBy,
    createdAt: approval.createdAt,
    expiresAt: approval.expiresAt,
    decidedAt: approval.decidedAt,
    idempotencyKey: approval.idempotencyKey,
    executionStatus: approval.executionStatus,
    draftId: approval.draftId,
    draftUrl: approval.draftUrl,
  }));
  let recommendations: string[] = [];
  try {
    const parsed = JSON.parse(run.recommendationsJson) as unknown;
    if (Array.isArray(parsed)) recommendations = parsed.filter((item): item is string => typeof item === "string");
  } catch {
    recommendations = [];
  }
  return {
    id: run._id,
    adminUserId: run.adminUserId,
    request: run.request,
    requestSummary: run.requestSummary,
    status: run.status,
    planSummary: run.planSummary,
    stepIndex: run.stepIndex,
    toolCallCount: run.toolCallCount,
    plannerCalls: run.plannerCalls,
    replanCount: run.replanCount,
    steps: stepRecords,
    approvals: approvalRecords,
    recommendations,
    report: run.reportJson ? (JSON.parse(run.reportJson) as AgentRunRecord["report"]) : undefined,
    failureReason: run.failureReason,
    errorCategory: run.errorCategory,
    approvalStatus: run.approvalStatus,
    version: run.version,
    leaseOwner: run.leaseOwner,
    leaseUntil: run.leaseUntil,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    completedAt: run.completedAt,
    expiresAt: run.expiresAt,
    limits: {
      maxToolCalls: run.maxToolCalls,
      maxPlannerCalls: 8,
      maxReplans: 2,
    },
    requireDraftApproval: run.requireDraftApproval,
    draftWritesEnabled: run.draftWritesEnabled,
  };
}

export async function bumpAgentMetric(
  ctx: MutationCtx,
  name: MetricName,
  now: number,
  amount = 1
): Promise<void> {
  const day = metricDay(now);
  const existing = await ctx.db
    .query("agentMetrics")
    .withIndex("by_day", (q) => q.eq("day", day))
    .unique();
  if (!existing) {
    const created = bumpMetric(emptyMetrics(day, now), name, amount, now);
    await ctx.db.insert("agentMetrics", created);
    return;
  }
  const next = bumpMetric(
    {
      day: existing.day,
      runsStarted: existing.runsStarted,
      runsCompleted: existing.runsCompleted,
      runsFailed: existing.runsFailed,
      runsCancelled: existing.runsCancelled,
      runsExpired: existing.runsExpired,
      toolSuccess: existing.toolSuccess,
      toolFailure: existing.toolFailure,
      approvalRequests: existing.approvalRequests,
      approvalDecisions: existing.approvalDecisions,
      providerFailures: existing.providerFailures,
      fallbackUsage: existing.fallbackUsage,
      totalSteps: existing.totalSteps,
      totalLatencyMs: existing.totalLatencyMs,
      updatedAt: existing.updatedAt,
    },
    name,
    amount,
    now
  );
  await ctx.db.patch(existing._id, next);
}

export const loadRun = internalQuery({
  args: { runId: v.id("agentRuns") },
  handler: async (ctx, args) => readRunRecord(ctx, args.runId),
});

export const claimRun = internalMutation({
  args: { runId: v.id("agentRuns"), owner: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return { ok: false as const, reason: "missing" };
    const claim = claimLease(
      {
        status: run.status,
        version: run.version,
        leaseOwner: run.leaseOwner,
        leaseUntil: run.leaseUntil,
        expiresAt: run.expiresAt,
      },
      args.owner,
      args.now,
      LEASE_MS
    );
    if (!claim.ok) return claim;
    await ctx.db.patch(args.runId, {
      status: claim.status,
      version: claim.version,
      leaseOwner: claim.leaseOwner,
      leaseUntil: claim.leaseUntil,
      updatedAt: args.now,
    });
    return { ok: true as const, version: claim.version };
  },
});

export const bump = internalMutation({
  args: { name: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    const allowed: MetricName[] = [
      "runsStarted",
      "runsCompleted",
      "runsFailed",
      "runsCancelled",
      "runsExpired",
      "toolSuccess",
      "toolFailure",
      "approvalRequests",
      "approvalDecisions",
      "providerFailures",
      "fallbackUsage",
      "totalSteps",
      "totalLatencyMs",
    ];
    if (!allowed.includes(args.name as MetricName)) return;
    await bumpAgentMetric(ctx, args.name as MetricName, args.now);
  },
});

export const commitAdvance = internalMutation({
  args: {
    runId: v.id("agentRuns"),
    expectedVersion: v.number(),
    status: v.string(),
    planSummary: v.string(),
    stepIndex: v.number(),
    toolCallCount: v.number(),
    plannerCalls: v.number(),
    replanCount: v.number(),
    approvalStatus: v.string(),
    recommendationsJson: v.string(),
    reportJson: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    errorCategory: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    stepsJson: v.string(),
    approvalsJson: v.string(),
    metric: v.optional(v.string()),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.version !== args.expectedVersion || isTerminal(run.status)) {
      return { ok: false as const };
    }
    const steps = JSON.parse(args.stepsJson) as AgentStepRecord[];
    const approvals = JSON.parse(args.approvalsJson) as ApprovalRecord[];
    const existingSteps = await ctx.db
      .query("agentSteps")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .take(40);
    const existingKeys = new Set(existingSteps.map((step) => step.idempotencyKey).filter(Boolean));
    for (const step of steps) {
      if (step.idempotencyKey && existingKeys.has(step.idempotencyKey)) continue;
      if (existingSteps.some((row) => row.stepIndex === step.stepIndex)) continue;
      await ctx.db.insert("agentSteps", {
        runId: args.runId,
        stepIndex: step.stepIndex,
        kind: step.kind,
        toolName: step.toolName,
        argumentsJson: step.arguments ? JSON.stringify(step.arguments).slice(0, 8_000) : undefined,
        resultJson: step.result ? JSON.stringify(step.result).slice(0, 10_240) : undefined,
        status: step.status,
        summary: step.summary.slice(0, 500),
        risk: step.risk,
        durationMs: step.durationMs,
        errorCategory: step.errorCategory,
        idempotencyKey: step.idempotencyKey,
        factType: step.factType,
        createdAt: args.now,
      });
      await ctx.db.insert("agentAuditLogs", {
        runId: args.runId,
        adminUserId: run.adminUserId,
        action: step.kind === "approval" ? "approval_requested" : "tool_finished",
        toolName: step.toolName,
        summary: step.summary.slice(0, 300),
        createdAt: args.now,
      });
    }
    const existingApprovals = await ctx.db
      .query("agentApprovals")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .take(10);
    for (const approval of approvals) {
      const current = existingApprovals.find((row) => row.approvalKey === approval.id);
      if (!current) {
        await ctx.db.insert("agentApprovals", {
          runId: args.runId,
          approvalKey: approval.id,
          stepIndex: approval.stepIndex,
          toolName: approval.toolName,
          argumentsHash: approval.argumentsHash,
          argumentsJson: JSON.stringify(approval.arguments).slice(0, 8_000),
          summary: approval.summary.slice(0, 500),
          risk: "draft_writing",
          status: approval.status,
          requestedBy: approval.requestedBy,
          decidedBy: approval.decidedBy,
          createdAt: approval.createdAt,
          expiresAt: approval.expiresAt,
          decidedAt: approval.decidedAt,
          idempotencyKey: approval.idempotencyKey,
          executionStatus: approval.executionStatus,
          draftId: approval.draftId,
          draftUrl: approval.draftUrl,
        });
        continue;
      }
      await ctx.db.patch(current._id, {
        status: approval.status,
        executionStatus: approval.executionStatus,
        decidedBy: approval.decidedBy,
        decidedAt: approval.decidedAt,
        draftId: approval.draftId,
        draftUrl: approval.draftUrl,
      });
    }
    const status = args.status as AgentState;
    await ctx.db.patch(args.runId, {
      status,
      planSummary: args.planSummary.slice(0, 500),
      stepIndex: args.stepIndex,
      toolCallCount: args.toolCallCount,
      plannerCalls: args.plannerCalls,
      replanCount: args.replanCount,
      approvalStatus: args.approvalStatus as AgentRunRecord["approvalStatus"],
      recommendationsJson: args.recommendationsJson.slice(0, 4_000),
      reportJson: args.reportJson?.slice(0, 12_000),
      failureReason: args.failureReason?.slice(0, 300),
      errorCategory: args.errorCategory,
      completedAt: args.completedAt,
      version: run.version + 1,
      leaseOwner: undefined,
      leaseUntil: undefined,
      updatedAt: args.now,
    });
    if (args.metric === "tool_success") await bumpAgentMetric(ctx, "toolSuccess", args.now);
    if (args.metric === "tool_failure") await bumpAgentMetric(ctx, "toolFailure", args.now);
    if (args.metric === "approval_request") await bumpAgentMetric(ctx, "approvalRequests", args.now);
    if (args.metric === "completed") {
      await bumpAgentMetric(ctx, "runsCompleted", args.now);
      await bumpAgentMetric(ctx, "totalSteps", args.now, args.toolCallCount);
    }
    if (args.metric === "failed" || args.metric === "provider_failure") {
      await bumpAgentMetric(ctx, "runsFailed", args.now);
      if (args.metric === "provider_failure") await bumpAgentMetric(ctx, "providerFailures", args.now);
    }
    if (args.metric === "cancelled") await bumpAgentMetric(ctx, "runsCancelled", args.now);
    if (args.metric === "expired") await bumpAgentMetric(ctx, "runsExpired", args.now);
    return { ok: true as const };
  },
});

export const failRun = internalMutation({
  args: { runId: v.id("agentRuns"), expectedVersion: v.number(), reason: v.string() },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.version !== args.expectedVersion || isTerminal(run.status)) return { ok: false as const };
    const now = Date.now();
    await ctx.db.patch(args.runId, {
      status: "failed",
      failureReason: safeErrorMessage(args.reason).slice(0, 300),
      errorCategory: "internal",
      completedAt: now,
      updatedAt: now,
      version: run.version + 1,
      leaseOwner: undefined,
      leaseUntil: undefined,
    });
    await bumpAgentMetric(ctx, "runsFailed", now);
    await ctx.db.insert("agentAuditLogs", {
      runId: args.runId,
      adminUserId: run.adminUserId,
      action: "run_failed",
      summary: safeErrorMessage(args.reason).slice(0, 300),
      createdAt: now,
    });
    return { ok: true as const };
  },
});

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export const createApprovedDraft = internalMutation({
  args: {
    runId: v.id("agentRuns"),
    idempotencyKey: v.string(),
    title: v.string(),
    subject: v.string(),
    body: v.string(),
    productIds: v.array(v.id("products")),
    promotionExplanation: v.string(),
    rationale: v.string(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return { available: false as const, reason: "missing_run" };
    if (!run.draftWritesEnabled) return { available: false as const, reason: "draft_writes_disabled" };
    const approvals = await ctx.db
      .query("agentApprovals")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .take(10);
    const approval = approvals.find((item) => item.idempotencyKey === args.idempotencyKey);
    if (approval?.executionStatus === "executed" && approval.draftId) {
      return {
        available: true as const,
        draftId: approval.draftId,
        url: approval.draftUrl ?? `/admin/email-marketing/campaigns/${approval.draftId}`,
        title: args.title,
        summary: `Draft saved: ${args.title}`,
      };
    }
    const argumentsMatch = approval
      ? assertDraftExecutionAllowed({
          approval: {
            id: approval.approvalKey,
            stepIndex: approval.stepIndex,
            toolName: approval.toolName,
            arguments: parseObject(approval.argumentsJson) ?? {},
            argumentsHash: approval.argumentsHash,
            summary: approval.summary,
            risk: "draft_writing",
            status: approval.status,
            requestedBy: approval.requestedBy,
            createdAt: approval.createdAt,
            expiresAt: approval.expiresAt,
            idempotencyKey: approval.idempotencyKey,
            executionStatus: approval.executionStatus,
          },
          toolName: "create_marketing_campaign_draft",
          args: {
            title: args.title,
            subject: args.subject,
            body: args.body,
            productIds: args.productIds,
            promotionExplanation: args.promotionExplanation,
            rationale: args.rationale,
          },
          draftWritesEnabled: true,
          now: Date.now(),
        })
      : { ok: false as const, error: "approval_required" };
    if (run.requireDraftApproval && !argumentsMatch.ok) {
      return { available: false as const, reason: argumentsMatch.error };
    }
    const existing = await ctx.db
      .query("emailCampaigns")
      .withIndex("by_idempotency", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .unique();
    if (existing) {
      return {
        available: true as const,
        draftId: existing._id,
        url: `/admin/email-marketing/campaigns/${existing._id}`,
        title: existing.name,
        summary: `Draft saved: ${existing.name}`,
      };
    }
    for (const productId of args.productIds) {
      const product = await ctx.db.get(productId);
      if (!product) return { available: false as const, reason: "missing_product" };
    }
    const now = Date.now();
    const body = escapeHtml(args.body).replaceAll("\n", "<br />");
    const id = await ctx.db.insert("emailCampaigns", {
      name: args.title.trim(),
      subject: args.subject.trim(),
      headline: args.title.trim(),
      previewText: args.rationale.trim().slice(0, 180),
      productPromoText: args.promotionExplanation.trim(),
      contentJson: JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: args.body.trim() }] }],
      }),
      contentHtml: `<p>${body}</p>`,
      productIds: args.productIds,
      segmentType: "all",
      status: "draft",
      recipientCount: 0,
      productCount: args.productIds.length,
      emailsSent: 0,
      emailsDelivered: 0,
      emailsFailed: 0,
      emailsOpened: 0,
      emailsClicked: 0,
      uniqueOpens: 0,
      uniqueClicks: 0,
      attributedRevenue: 0,
      idempotencyKey: args.idempotencyKey,
      createdByUserId: run.adminUserId,
      createdByName: run.adminName,
      createdAt: now,
      updatedAt: now,
    });
    if (approval) {
      await ctx.db.patch(approval._id, {
        executionStatus: "executed",
        draftId: id,
        draftUrl: `/admin/email-marketing/campaigns/${id}`,
      });
    }
    await ctx.db.insert("agentAuditLogs", {
      runId: args.runId,
      adminUserId: run.adminUserId,
      action: "draft_created",
      toolName: "create_marketing_campaign_draft",
      summary: `Saved draft ${args.title}`.slice(0, 300),
      createdAt: now,
    });
    return {
      available: true as const,
      draftId: id,
      url: `/admin/email-marketing/campaigns/${id}`,
      title: args.title.trim(),
      summary: `Draft saved: ${args.title.trim()}`,
    };
  },
});

export const resumeDueRuns = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const statuses: AgentState[] = ["planning", "running", "resuming", "created"];
    let scheduled = 0;
    for (const status of statuses) {
      const rows = await ctx.db
        .query("agentRuns")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(10);
      for (const run of rows) {
        if (run.expiresAt <= now) {
          await ctx.db.patch(run._id, {
            status: "expired",
            failureReason: "The agent run expired before it finished",
            errorCategory: "expired",
            completedAt: now,
            updatedAt: now,
            leaseOwner: undefined,
            leaseUntil: undefined,
            version: run.version + 1,
          });
          await bumpAgentMetric(ctx, "runsExpired", now);
          continue;
        }
        if (run.leaseUntil && run.leaseUntil > now) continue;
        await ctx.scheduler.runAfter(0, internal.agentActions.advance, { runId: run._id });
        scheduled += 1;
      }
    }
    const waiting = await ctx.db
      .query("agentRuns")
      .withIndex("by_status", (q) => q.eq("status", "waiting_for_approval"))
      .take(10);
    for (const run of waiting) {
      const approvals = await ctx.db
        .query("agentApprovals")
        .withIndex("by_run", (q) => q.eq("runId", run._id))
        .take(5);
      if (approvals.some((approval) => approval.status === "pending" && approval.expiresAt <= now) || run.expiresAt <= now) {
        await ctx.db.patch(run._id, {
          status: "expired",
          approvalStatus: "expired",
          failureReason: "The approval expired",
          errorCategory: "expired",
          completedAt: now,
          updatedAt: now,
          version: run.version + 1,
        });
        for (const approval of approvals) {
          if (approval.status === "pending") {
            await ctx.db.patch(approval._id, { status: "expired", executionStatus: "skipped", decidedAt: now });
          }
        }
        await bumpAgentMetric(ctx, "runsExpired", now);
      }
    }
    const oldAudits = await ctx.db
      .query("agentAuditLogs")
      .withIndex("by_created", (q) => q.lt("createdAt", now - AUDIT_RETENTION_MS))
      .take(50);
    for (const audit of oldAudits) await ctx.db.delete(audit._id);
    const expiredRuns = await ctx.db
      .query("agentRuns")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now - AUDIT_RETENTION_MS))
      .take(20);
    for (const run of expiredRuns) {
      const steps = await ctx.db.query("agentSteps").withIndex("by_run", (q) => q.eq("runId", run._id)).take(40);
      const approvals = await ctx.db.query("agentApprovals").withIndex("by_run", (q) => q.eq("runId", run._id)).take(10);
      for (const step of steps) await ctx.db.delete(step._id);
      for (const approval of approvals) await ctx.db.delete(approval._id);
      await ctx.db.delete(run._id);
    }
    return { scheduled };
  },
});

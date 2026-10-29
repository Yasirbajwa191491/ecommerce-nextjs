"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { advanceAgent } from "./lib/agents/orchestrator";
import { buildAgentSystemPrompt, buildAgentUserPrompt } from "./lib/agents/llmDecision";
import { requestAgentDecision } from "./lib/agents/nativeToolCall";
import { safeErrorMessage } from "./lib/agents/security";
import type { AgentRunRecord, ToolHandler } from "./lib/agents/types";

export const advance = internalAction({
  args: { runId: v.id("agentRuns") },
  handler: async (ctx, args) => {
    const owner = crypto.randomUUID();
    const now = Date.now();
    const claim = await ctx.runMutation(internal.agentInternal.claimRun, {
      runId: args.runId,
      owner,
      now,
    });
    if (!claim.ok) return;
    try {
      const snapshot = await ctx.runQuery(internal.agentInternal.loadRun, { runId: args.runId });
      if (!snapshot) return;
      const started = Date.now();
      const handlers = toolHandlers(ctx, args.runId, claim.version, owner);
      const outcome = await advanceAgent(snapshot as AgentRunRecord, {
        now: Date.now(),
        actorRole: "admin",
        backoffMs: 25,
        planner: async (input) => {
          if (Date.now() - started > 20_000) {
            return { kind: "provider_failure", message: "The planning step exceeded its time budget" };
          }
          const decision = await withTimeout(
            requestAgentDecision({
              system: buildAgentSystemPrompt(),
              user: buildAgentUserPrompt(input),
            }),
            18_000
          );
          if (decision.usedFallback) {
            await ctx.runMutation(internal.agentInternal.bump, {
              name: "fallbackUsage",
              now: Date.now(),
            });
          }
          return decision.decision;
        },
        handlers,
      });
      const committed = await ctx.runMutation(internal.agentInternal.commitAdvance, {
        runId: args.runId,
        expectedVersion: claim.version,
        status: outcome.run.status,
        planSummary: outcome.run.planSummary,
        stepIndex: outcome.run.stepIndex,
        toolCallCount: outcome.run.toolCallCount,
        plannerCalls: outcome.run.plannerCalls,
        replanCount: outcome.run.replanCount,
        approvalStatus: outcome.run.approvalStatus,
        recommendationsJson: JSON.stringify(outcome.run.recommendations),
        reportJson: outcome.run.report ? JSON.stringify(outcome.run.report) : undefined,
        failureReason: outcome.run.failureReason,
        errorCategory: outcome.run.errorCategory,
        completedAt: outcome.run.completedAt,
        stepsJson: JSON.stringify(outcome.run.steps.slice(snapshot.steps.length)),
        approvalsJson: JSON.stringify(outcome.run.approvals),
        metric: outcome.metric,
        now: Date.now(),
      });
      if (committed.ok && outcome.continue) {
        await ctx.scheduler.runAfter(0, internal.agentActions.advance, { runId: args.runId });
      }
    } catch (error) {
      await ctx.runMutation(internal.agentInternal.failRun, {
        runId: args.runId,
        expectedVersion: claim.version,
        reason: safeErrorMessage(error),
      });
    }
  },
});

function toolHandlers(ctx: ActionCtx, runId: Id<"agentRuns">, expectedVersion: number, leaseOwner: string): Partial<Record<string, ToolHandler>> {
  const now = Date.now();
  return {
    get_sales_analytics: async (args) =>
      ctx.runQuery(internal.agentData.salesAnalytics, {
        range: args.range === "7d" || args.range === "90d" ? args.range : "30d",
        category: typeof args.category === "string" ? args.category : undefined,
        referenceNow: now,
      }),
    get_product_performance: async (args) =>
      ctx.runQuery(internal.agentData.productPerformance, {
        query: typeof args.query === "string" ? args.query : undefined,
        productId: typeof args.productId === "string" ? args.productId : undefined,
        range: args.range === "7d" || args.range === "30d" || args.range === "90d" ? args.range : undefined,
        referenceNow: now,
      }),
    get_inventory_insights: async (args) =>
      ctx.runQuery(internal.agentData.inventoryInsights, {
        query: typeof args.query === "string" ? args.query : undefined,
        limit: typeof args.limit === "number" ? args.limit : undefined,
        referenceNow: now,
      }),
    get_demand_forecast: async (args) =>
      ctx.runQuery(internal.agentData.demandForecast, {
        query: typeof args.query === "string" ? args.query : undefined,
      }),
    search_products: async (args) =>
      ctx.runQuery(internal.agentData.searchProducts, {
        query: String(args.query ?? ""),
        limit: typeof args.limit === "number" ? args.limit : undefined,
      }),
    get_marketing_campaigns: async (args) =>
      ctx.runQuery(internal.agentData.marketingCampaigns, {
        status: args.status === "draft" || args.status === "sent" || args.status === "all" ? args.status : undefined,
        limit: typeof args.limit === "number" ? args.limit : undefined,
      }),
    retrieve_store_knowledge: async (args) =>
      ctx.runQuery(internal.agentData.storeKnowledge, {
        question: String(args.question ?? ""),
      }),
    create_marketing_campaign_draft: async (args, context) => {
      const productIds = Array.isArray(args.productIds) ? args.productIds.map(String) : [];
      try {
        return await ctx.runMutation(internal.agentInternal.createApprovedDraft, {
          runId, expectedVersion, leaseOwner,
          idempotencyKey: context.idempotencyKey,
          title: String(args.title ?? ""),
          subject: String(args.subject ?? ""),
          body: String(args.body ?? ""),
          productIds: productIds as Id<"products">[],
          promotionExplanation: String(args.promotionExplanation ?? ""),
          rationale: String(args.rationale ?? ""),
        });
      } catch (error) {
        return { available: false, reason: "missing_product", summary: safeErrorMessage(error) };
      }
    },
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("provider_timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

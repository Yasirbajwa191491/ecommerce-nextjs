import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/requireAdmin";
import {
  deploymentGateEnabled,
  MLOPS_DRIFT_ENV,
  MLOPS_MONITORING_ENV,
} from "./lib/mlops/config";
import { defaultRagEnv, postRag, ragServiceConfigured } from "./lib/rag/pythonRagClient";
import { mlFamilyValidator } from "./lib/mlops/validators";

type ValidationReport = {
  ok?: boolean;
  checksum?: string;
  reasons?: string[];
  customer_serving?: string;
};

type DriftReport = {
  status?: string;
  severity?: "normal" | "warning" | "critical" | "insufficient_data";
  score?: number | null;
  sample_size?: number;
  metric?: string;
};

export const validateRegisteredModel = action({
  args: { modelId: v.string(), modelFamily: mlFamilyValidator },
  handler: async (ctx, args): Promise<{ lifecycleStatus: string; customerServing: string }> => {
    const admin = await requireAdmin(ctx);
    if (args.modelFamily === "rag_index") {
      throw new Error("retrieval_index_not_a_model");
    }
    const env = defaultRagEnv();
    if (!ragServiceConfigured(env)) {
      return { lifecycleStatus: "registered", customerServing: "unchanged" };
    }
    const report = await postRag<ValidationReport>(
      "/api/v1/internal/mlops/validate",
      { family: args.modelFamily },
      env
    );
    const applied = await ctx.runMutation(internal.mlops.applyValidationReport, {
      modelId: args.modelId,
      ok: report.ok === true,
      checksum: report.checksum ?? "",
      actor: `admin:${admin._id}`,
    });
    return {
      lifecycleStatus: applied.lifecycleStatus,
      customerServing: report.customer_serving ?? "unchanged",
    };
  },
});

export const evaluateDrift = action({
  args: {
    modelFamily: mlFamilyValidator,
    featureName: v.string(),
    metric: v.union(v.literal("psi"), v.literal("js"), v.literal("missing")),
    reference: v.array(v.union(v.number(), v.string(), v.boolean())),
    current: v.array(v.union(v.number(), v.string(), v.boolean())),
    referencePeriod: v.string(),
    currentPeriod: v.string(),
    datasetVersion: v.string(),
    consecutiveHits: v.number(),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    | { status: "disabled" }
    | { status: "service_unconfigured" }
    | {
        status: string;
        severity: "normal" | "warning" | "critical" | "insufficient_data";
        recorded: { action: string; fingerprint: string };
      }
  > => {
    await requireAdmin(ctx);
    if (!deploymentGateEnabled(process.env[MLOPS_DRIFT_ENV])) {
      return { status: "disabled" as const };
    }
    if (args.reference.length > 500 || args.current.length > 500) {
      throw new Error("drift sample is too large");
    }
    const env = defaultRagEnv();
    if (!ragServiceConfigured(env)) return { status: "service_unconfigured" as const };
    const report = await postRag<DriftReport>(
      "/api/v1/internal/mlops/drift",
      { metric: args.metric, reference: args.reference, current: args.current },
      env
    );
    if (report.status === "disabled") return { status: "disabled" as const };
    const severity = report.severity ?? "insufficient_data";
    const recorded = await ctx.runMutation(internal.mlops.recordDrift, {
      modelFamily: args.modelFamily,
      featureName: args.featureName,
      metric: report.metric ?? args.metric,
      referencePeriod: args.referencePeriod,
      currentPeriod: args.currentPeriod,
      driftScore: report.score ?? null,
      severity,
      sampleSize: report.sample_size ?? 0,
      datasetVersion: args.datasetVersion,
      consecutiveHits: args.consecutiveHits,
    });
    return { status: report.status ?? "ok", severity, recorded };
  },
});

export const monitoringEnabled = action({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return { enabled: deploymentGateEnabled(process.env[MLOPS_MONITORING_ENV]) };
  },
});

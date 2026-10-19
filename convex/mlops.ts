import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireAdmin } from "./lib/requireAdmin";
import { alertDecision } from "./lib/mlops/alerts";
import {
  deploymentGateEnabled,
  ENABLE_ML_DRIFT_DETECTION_KEY,
  ENABLE_ML_RETRAINING_REQUESTS_KEY,
  ENABLE_MLOPS_MONITORING_KEY,
  ML_MONITORING_RETENTION_DAYS_KEY,
  MLOPS_DRIFT_ENV,
  MLOPS_MONITORING_ENV,
  MLOPS_RETRAINING_ENV,
  parseMlopsEnabled,
  parseRetentionDays,
  resolveOperationalGate,
} from "./lib/mlops/config";
import { compareEvaluations, parseMetrics, promotionGate, type EvaluationView, type MetricKind } from "./lib/mlops/evaluation";
import {
  applyEvaluation,
  applyValidation,
  beginApproval,
  planActivation,
  planRollback,
  validateRegistration,
  type RegistryModel,
} from "./lib/mlops/lifecycle";
import { bucketExpired, emptyBucket, foldMonitoring, type MonitorOutcome } from "./lib/mlops/monitoring";
import {
  assertAllowlistedJob,
  completeReviewedJob,
  datasetAllowed,
  duplicateRequest,
  nextRetrainState,
} from "./lib/mlops/retraining";
import {
  datasetTypeValidator,
  mlFamilyValidator,
  retrainJobValidator,
  retrainStateValidator,
  type DatasetType,
  type MlFamily,
  type RetrainJobType,
  type RetrainState,
} from "./lib/mlops/validators";

const JOB_FAMILY: Record<RetrainJobType, MlFamily> = {
  content_retrain: "content",
  collaborative_retrain: "collaborative",
  neural_retrain: "neural",
  forecast_retrain: "demand_forecast",
  hybrid_config_refresh: "hybrid",
};

function actorId(userId: string): string {
  return `admin:${userId}`;
}

function toRegistry(row: Doc<"mlModelRegistry">): RegistryModel {
  return {
    modelId: row.modelId,
    modelFamily: row.modelFamily,
    modelVersion: row.modelVersion,
    artifactVersion: row.artifactVersion,
    featureSchemaVersion: row.featureSchemaVersion,
    datasetFingerprint: row.datasetFingerprint,
    datasetType: row.datasetType,
    artifactChecksum: row.artifactChecksum,
    lifecycleStatus: row.lifecycleStatus,
    artifactAvailability: row.artifactAvailability,
    runtimeStatus: row.runtimeStatus,
    evaluationStatus: row.evaluationStatus,
    promotionInflight: row.promotionInflight,
    registeredAt: row.registeredAt,
  };
}

async function writeAudit(
  ctx: MutationCtx,
  entry: { actor: string; action: string; modelId: string; outcome: string; reason: string }
) {
  await ctx.db.insert("mlModelAuditLogs", {
    ...entry,
    reason: entry.reason.slice(0, 180),
    createdAt: Date.now(),
  });
}

async function settingValue(ctx: QueryCtx | MutationCtx, key: string): Promise<string | undefined> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  return row?.value;
}

function gateFor(adminValue: string | undefined, envName: string) {
  return resolveOperationalGate({
    adminEnabled: parseMlopsEnabled(adminValue),
    deploymentGate: deploymentGateEnabled(process.env[envName]),
  });
}

async function requireModel(ctx: MutationCtx, modelId: string) {
  const row = await ctx.db
    .query("mlModelRegistry")
    .withIndex("by_model_id", (q) => q.eq("modelId", modelId))
    .unique();
  if (!row) throw new ConvexError("Model registration was not found");
  return row;
}

function evaluationView(row: Doc<"mlModelEvaluations">, family: string, version: string): EvaluationView {
  const metrics = JSON.parse(row.metricsJson) as Record<string, number>;
  return {
    modelFamily: family,
    modelVersion: version,
    datasetFingerprint: row.datasetFingerprint,
    datasetType: row.datasetType,
    protocol: row.protocol,
    sampleCount: row.sampleCount,
    metricKind: row.metricKind,
    metrics,
    horizonOrK: row.horizonOrK,
  };
}

export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const monitoring = gateFor(await settingValue(ctx, ENABLE_MLOPS_MONITORING_KEY), MLOPS_MONITORING_ENV);
    const drift = gateFor(await settingValue(ctx, ENABLE_ML_DRIFT_DETECTION_KEY), MLOPS_DRIFT_ENV);
    const retraining = gateFor(
      await settingValue(ctx, ENABLE_ML_RETRAINING_REQUESTS_KEY),
      MLOPS_RETRAINING_ENV
    );
    const models = await ctx.db.query("mlModelRegistry").withIndex("by_registered").order("desc").take(20);
    const jobs = await ctx.db.query("mlRetrainingJobs").withIndex("by_state").order("desc").take(20);
    const alerts = await ctx.db.query("mlDriftAlerts").withIndex("by_status").order("desc").take(20);
    const monitoringRows = await ctx.db.query("mlModelMonitoring").withIndex("by_bucket").order("desc").take(14);
    const audits = await ctx.db.query("mlModelAuditLogs").withIndex("by_created").order("desc").take(20);
    const promotions = await ctx.db.query("mlModelPromotions").withIndex("by_created").order("desc").take(20);
    const [shadow] = await ctx.db.query("pythonMlShadowRuns").withIndex("by_created").order("desc").take(1);
    const [forecast] = await ctx.db
      .query("forecastPublications")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(1);
    const [rag] = await ctx.db.query("ragIndexState").take(1);
    const [quality] = await ctx.db.query("forecastQualityRuns").withIndex("by_updated").order("desc").take(1);
    const [snapshot] = await ctx.db.query("inventorySnapshotRuns").withIndex("by_date").order("desc").take(1);
    return {
      gates: { monitoring, drift, retraining },
      models,
      jobs,
      alerts,
      monitoring: monitoringRows,
      audits,
      promotions,
      shadow: shadow
        ? {
            status: shadow.status,
            overlapAtK: shadow.overlapAtK ?? null,
            fallbackCount: shadow.fallbackCount,
            createdAt: shadow.createdAt,
            note: "Shadow overlap is not recommendation relevance.",
          }
        : null,
      forecast: forecast
        ? { modelVersion: forecast.modelVersion, dataCutoff: forecast.dataCutoff, generatedAt: forecast.generatedAt }
        : null,
      rag: rag
        ? {
            indexVersion: rag.indexVersion,
            embeddingVersion: rag.embeddingVersion,
            reindexStatus: rag.reindexStatus ?? "idle",
            updatedAt: rag.updatedAt,
          }
        : null,
      forecastQuality: quality,
      stockSnapshot: snapshot,
    };
  },
});

export const compareModels = query({
  args: { leftModelId: v.string(), rightModelId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const left = await ctx.db
      .query("mlModelRegistry")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.leftModelId))
      .unique();
    const right = await ctx.db
      .query("mlModelRegistry")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.rightModelId))
      .unique();
    if (!left || !right) return { status: "not_comparable" as const, reasons: ["missing_model"], deltas: {} };
    const [leftEval] = await ctx.db
      .query("mlModelEvaluations")
      .withIndex("by_model", (q) => q.eq("modelId", left.modelId))
      .order("desc")
      .take(1);
    const [rightEval] = await ctx.db
      .query("mlModelEvaluations")
      .withIndex("by_model", (q) => q.eq("modelId", right.modelId))
      .order("desc")
      .take(1);
    if (!leftEval || !rightEval) {
      return { status: "not_comparable" as const, reasons: ["missing_evaluation"], deltas: {} };
    }
    return compareEvaluations(
      evaluationView(leftEval, left.modelFamily, left.modelVersion),
      evaluationView(rightEval, right.modelFamily, right.modelVersion)
    );
  },
});

export const registerModel = mutation({
  args: {
    modelFamily: mlFamilyValidator,
    modelVersion: v.string(),
    artifactVersion: v.string(),
    featureSchemaVersion: v.string(),
    datasetFingerprint: v.string(),
    datasetType: datasetTypeValidator,
    artifactChecksum: v.string(),
    trainingTimestamp: v.string(),
    metadataJson: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    let metadata: Record<string, string> = {};
    try {
      const parsed = JSON.parse(args.metadataJson) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("invalid");
      }
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value !== "string" || key.length > 40 || value.length > 80) {
          throw new Error("invalid");
        }
        metadata[key] = value;
      }
    } catch {
      throw new ConvexError("Model metadata must be a small string map");
    }
    const decision = validateRegistration({ ...args, metadata }, []);
    if (!decision.ok) throw new ConvexError(decision.reason);
    const duplicate = await ctx.db
      .query("mlModelRegistry")
      .withIndex("by_model_id", (q) => q.eq("modelId", decision.modelId))
      .unique();
    if (duplicate) throw new ConvexError("duplicate_version");
    const id = await ctx.db.insert("mlModelRegistry", {
      modelId: decision.modelId,
      modelFamily: args.modelFamily,
      modelVersion: args.modelVersion,
      artifactVersion: args.artifactVersion,
      featureSchemaVersion: args.featureSchemaVersion,
      datasetFingerprint: args.datasetFingerprint,
      datasetType: args.datasetType,
      artifactChecksum: args.artifactChecksum,
      trainingTimestamp: args.trainingTimestamp.slice(0, 40),
      registeredAt: Date.now(),
      registeredBy: actorId(admin._id),
      evaluationStatus: "missing",
      lifecycleStatus: "registered",
      artifactAvailability: "unknown",
      runtimeStatus: "not_activated",
      promotionInflight: false,
      modelMetadataJson: JSON.stringify(metadata),
      evaluationSummaryJson: "{}",
    });
    await writeAudit(ctx, {
      actor: actorId(admin._id),
      action: "register",
      modelId: decision.modelId,
      outcome: "registered",
      reason: "metadata_only",
    });
    return { modelId: decision.modelId, id };
  },
});

export const applyValidationReport = internalMutation({
  args: {
    modelId: v.string(),
    ok: v.boolean(),
    checksum: v.string(),
    actor: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await requireModel(ctx, args.modelId);
    const applied = applyValidation(toRegistry(row), { ok: args.ok, checksum: args.checksum });
    if (!applied.ok) throw new ConvexError(applied.reason);
    await ctx.db.patch(row._id, {
      lifecycleStatus: applied.model.lifecycleStatus,
      artifactAvailability: applied.model.artifactAvailability,
      runtimeStatus: applied.model.runtimeStatus,
    });
    await writeAudit(ctx, {
      actor: args.actor,
      action: "validate",
      modelId: row.modelId,
      outcome: applied.model.lifecycleStatus,
      reason: args.ok ? "checksum_matched" : "artifact_rejected",
    });
    return { lifecycleStatus: applied.model.lifecycleStatus };
  },
});

export const recordEvaluation = mutation({
  args: {
    modelId: v.string(),
    datasetFingerprint: v.string(),
    datasetType: datasetTypeValidator,
    protocol: v.string(),
    sampleCount: v.number(),
    metricKind: v.union(v.literal("ranking"), v.literal("forecast"), v.literal("retrieval")),
    metricsJson: v.string(),
    limitations: v.string(),
    horizonOrK: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (args.sampleCount < 0 || args.sampleCount > 1_000_000) {
      throw new ConvexError("invalid_metric");
    }
    if (args.limitations.includes("@") || args.protocol.length > 80) {
      throw new ConvexError("invalid_metric");
    }
    let parsed: Record<string, number>;
    try {
      parsed = JSON.parse(args.metricsJson) as Record<string, number>;
    } catch {
      throw new ConvexError("invalid_metric");
    }
    const metrics = parseMetrics(args.metricKind as MetricKind, parsed);
    if (!metrics.ok) throw new ConvexError(metrics.reason);
    const row = await requireModel(ctx, args.modelId);
    if (args.metricKind === "retrieval" && row.modelFamily !== "rag_index") {
      throw new ConvexError("retrieval metrics belong on the rag index record");
    }
    const applied = applyEvaluation(toRegistry(row), args.datasetType as DatasetType);
    if (!applied.ok) throw new ConvexError(applied.reason);
    await ctx.db.insert("mlModelEvaluations", {
      modelId: row.modelId,
      datasetFingerprint: args.datasetFingerprint.slice(0, 120),
      datasetType: args.datasetType,
      evaluatedAt: Date.now(),
      protocol: args.protocol.slice(0, 80),
      sampleCount: args.sampleCount,
      metricKind: args.metricKind,
      metricsJson: JSON.stringify(metrics.metrics),
      limitations: args.limitations.slice(0, 180),
      horizonOrK: args.horizonOrK,
    });
    await ctx.db.patch(row._id, {
      lifecycleStatus: applied.model.lifecycleStatus,
      evaluationStatus: applied.model.evaluationStatus as Doc<"mlModelRegistry">["evaluationStatus"],
      evaluationSummaryJson: JSON.stringify(metrics.metrics),
      datasetFingerprint: args.datasetFingerprint.slice(0, 120),
      datasetType: args.datasetType,
    });
    await writeAudit(ctx, {
      actor: actorId(admin._id),
      action: "record_evaluation",
      modelId: row.modelId,
      outcome: args.datasetType,
      reason: args.limitations.slice(0, 180) || args.protocol,
    });
    return { lifecycleStatus: applied.model.lifecycleStatus };
  },
});

export const approveModel = mutation({
  args: { modelId: v.string(), reason: v.string(), acceptSynthetic: v.boolean() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const row = await requireModel(ctx, args.modelId);
    const familyRows = await ctx.db
      .query("mlModelRegistry")
      .withIndex("by_family_version", (q) => q.eq("modelFamily", row.modelFamily))
      .take(40);
    const [evaluation] = await ctx.db
      .query("mlModelEvaluations")
      .withIndex("by_model", (q) => q.eq("modelId", row.modelId))
      .order("desc")
      .take(1);
    if (!evaluation) throw new ConvexError("quality_gate");
    const candidate = evaluationView(evaluation, row.modelFamily, row.modelVersion);
    const baselineRow = familyRows.find(
      (item) => item.modelId !== row.modelId && item.lifecycleStatus === "active"
    );
    let baseline: EvaluationView | null = null;
    if (baselineRow) {
      const [baselineEval] = await ctx.db
        .query("mlModelEvaluations")
        .withIndex("by_model", (q) => q.eq("modelId", baselineRow.modelId))
        .order("desc")
        .take(1);
      if (baselineEval) {
        baseline = evaluationView(baselineEval, baselineRow.modelFamily, baselineRow.modelVersion);
      }
    }
    const gate = promotionGate({
      candidate,
      baseline,
      acceptSynthetic: args.acceptSynthetic,
      checksumOk: row.artifactAvailability === "available",
      schemaOk: row.featureSchemaVersion.length > 0,
      smokeOk: row.artifactAvailability === "available",
    });
    const decision = beginApproval(familyRows.map(toRegistry), row.modelId, gate.ok);
    if (!decision.ok) throw new ConvexError(`${decision.reason}: ${gate.reasons.join(",")}`);
    await ctx.db.patch(row._id, {
      lifecycleStatus: "approved",
      promotionInflight: true,
    });
    await ctx.db.insert("mlModelPromotions", {
      modelFamily: row.modelFamily,
      nextModelId: row.modelId,
      actor: actorId(admin._id),
      createdAt: Date.now(),
      reason: args.reason.slice(0, 180),
      evaluationSummaryJson: row.evaluationSummaryJson,
      outcome: "approved",
    });
    await writeAudit(ctx, {
      actor: actorId(admin._id),
      action: "approve",
      modelId: row.modelId,
      outcome: "approved",
      reason: gate.reasons.join(",") || args.reason,
    });
    return { lifecycleStatus: "approved" as const, customerDeployment: "not_changed" as const, reasons: gate.reasons };
  },
});

export const rejectModel = mutation({
  args: { modelId: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const row = await requireModel(ctx, args.modelId);
    if (row.lifecycleStatus === "active" || row.lifecycleStatus === "archived") {
      throw new ConvexError("illegal_transition");
    }
    await ctx.db.patch(row._id, { lifecycleStatus: "rejected", promotionInflight: false });
    await ctx.db.insert("mlModelPromotions", {
      modelFamily: row.modelFamily,
      nextModelId: row.modelId,
      actor: actorId(admin._id),
      createdAt: Date.now(),
      reason: args.reason.slice(0, 180),
      evaluationSummaryJson: row.evaluationSummaryJson,
      outcome: "rejected",
    });
    await writeAudit(ctx, {
      actor: actorId(admin._id),
      action: "reject",
      modelId: row.modelId,
      outcome: "rejected",
      reason: args.reason,
    });
    return { lifecycleStatus: "rejected" as const };
  },
});

export const requestActivation = mutation({
  args: { modelId: v.string(), artifactAvailable: v.boolean(), reason: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const row = await requireModel(ctx, args.modelId);
    const plan = planActivation(toRegistry(row), args.artifactAvailable && row.artifactAvailability === "available");
    if (!plan.ok) throw new ConvexError(plan.reason);
    await ctx.db.patch(row._id, {
      lifecycleStatus: plan.lifecycle,
      runtimeStatus: plan.runtime,
      promotionInflight: false,
    });
    await ctx.db.insert("mlModelPromotions", {
      modelFamily: row.modelFamily,
      nextModelId: row.modelId,
      actor: actorId(admin._id),
      createdAt: Date.now(),
      reason: args.reason.slice(0, 180),
      evaluationSummaryJson: row.evaluationSummaryJson,
      outcome: plan.runtime,
    });
    await writeAudit(ctx, {
      actor: actorId(admin._id),
      action: "request_activation",
      modelId: row.modelId,
      outcome: plan.runtime,
      reason: "customer_deployment_not_changed",
    });
    return plan;
  },
});

export const requestRollback = mutation({
  args: { modelFamily: mlFamilyValidator, reason: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const rows = await ctx.db
      .query("mlModelRegistry")
      .withIndex("by_family_version", (q) => q.eq("modelFamily", args.modelFamily))
      .take(40);
    const plan = planRollback(rows.map(toRegistry), args.modelFamily);
    if (!plan.ok) {
      await writeAudit(ctx, {
        actor: actorId(admin._id),
        action: "rollback",
        modelId: args.modelFamily,
        outcome: plan.reason,
        reason: "customer_deployment_not_changed",
      });
      throw new ConvexError(plan.reason);
    }
    const current = rows.find((row) => row.modelId === plan.currentModelId);
    const previous = rows.find((row) => row.modelId === plan.previousModelId);
    if (!current || !previous) throw new ConvexError("missing_model");
    if (current.lifecycleStatus === "active") {
      await ctx.db.patch(current._id, { lifecycleStatus: "archived", runtimeStatus: "not_activated" });
    } else {
      await ctx.db.patch(current._id, { runtimeStatus: "not_activated", promotionInflight: false });
    }
    await ctx.db.patch(previous._id, {
      lifecycleStatus: "approved",
      runtimeStatus: "pending_deployment",
      promotionInflight: false,
    });
    await ctx.db.insert("mlModelPromotions", {
      modelFamily: args.modelFamily,
      previousModelId: current.modelId,
      nextModelId: previous.modelId,
      actor: actorId(admin._id),
      createdAt: Date.now(),
      reason: args.reason.slice(0, 180),
      evaluationSummaryJson: previous.evaluationSummaryJson,
      outcome: "pending_deployment",
    });
    await writeAudit(ctx, {
      actor: actorId(admin._id),
      action: "rollback",
      modelId: previous.modelId,
      outcome: "pending_deployment",
      reason: "customer_deployment_not_changed",
    });
    return { ...plan, note: "Registry points at the previous version. Serving weights are unchanged until a deployment restart." };
  },
});

export const recordMonitoring = mutation({
  args: {
    modelFamily: mlFamilyValidator,
    modelVersion: v.string(),
    timeBucket: v.string(),
    outcome: v.union(
      v.literal("success"),
      v.literal("failure"),
      v.literal("timeout"),
      v.literal("fallback")
    ),
    latencyMs: v.number(),
    errorCategory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const gate = gateFor(await settingValue(ctx, ENABLE_MLOPS_MONITORING_KEY), MLOPS_MONITORING_ENV);
    if (!gate.enabled) throw new ConvexError(gate.reason);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.timeBucket)) throw new ConvexError("invalid_bucket");
    const existing = await ctx.db
      .query("mlModelMonitoring")
      .withIndex("by_family_bucket", (q) =>
        q.eq("modelFamily", args.modelFamily).eq("timeBucket", args.timeBucket)
      )
      .take(5);
    const match = existing.find((row) => row.modelVersion === args.modelVersion);
    const folded = foldMonitoring(
      match
        ? {
            family: match.modelFamily,
            modelVersion: match.modelVersion,
            timeBucket: match.timeBucket,
            requestCount: match.requestCount,
            successCount: match.successCount,
            failureCount: match.failureCount,
            timeoutCount: match.timeoutCount,
            fallbackCount: match.fallbackCount,
            latencyCount: match.latencyCount,
            latencySumMs: match.latencySumMs,
            latencyMaxMs: match.latencyMaxMs,
            lastErrorCategory: match.lastErrorCategory,
          }
        : emptyBucket(args.modelFamily, args.modelVersion, args.timeBucket),
      {
        outcome: args.outcome as MonitorOutcome,
        latencyMs: args.latencyMs,
        errorCategory: args.errorCategory,
      }
    );
    const now = Date.now();
    if (match) {
      await ctx.db.patch(match._id, {
        requestCount: folded.requestCount,
        successCount: folded.successCount,
        failureCount: folded.failureCount,
        timeoutCount: folded.timeoutCount,
        fallbackCount: folded.fallbackCount,
        latencyCount: folded.latencyCount,
        latencySumMs: folded.latencySumMs,
        latencyMaxMs: folded.latencyMaxMs,
        lastErrorCategory: folded.lastErrorCategory,
        lastSuccessAt: args.outcome === "success" ? now : match.lastSuccessAt,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("mlModelMonitoring", {
        modelFamily: args.modelFamily,
        modelVersion: folded.modelVersion,
        timeBucket: folded.timeBucket,
        requestCount: folded.requestCount,
        successCount: folded.successCount,
        failureCount: folded.failureCount,
        timeoutCount: folded.timeoutCount,
        fallbackCount: folded.fallbackCount,
        latencyCount: folded.latencyCount,
        latencySumMs: folded.latencySumMs,
        latencyMaxMs: folded.latencyMaxMs,
        lastErrorCategory: folded.lastErrorCategory,
        lastSuccessAt: args.outcome === "success" ? now : undefined,
        updatedAt: now,
      });
    }
    return { status: "recorded" as const };
  },
});

export const recordDrift = internalMutation({
  args: {
    modelFamily: mlFamilyValidator,
    featureName: v.string(),
    metric: v.string(),
    referencePeriod: v.string(),
    currentPeriod: v.string(),
    driftScore: v.union(v.number(), v.null()),
    severity: v.union(
      v.literal("normal"),
      v.literal("warning"),
      v.literal("critical"),
      v.literal("insufficient_data")
    ),
    sampleSize: v.number(),
    datasetVersion: v.string(),
    consecutiveHits: v.number(),
  },
  handler: async (ctx, args) => {
    const open = await ctx.db
      .query("mlDriftAlerts")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .take(30);
    const acknowledged = await ctx.db
      .query("mlDriftAlerts")
      .withIndex("by_status", (q) => q.eq("status", "acknowledged"))
      .take(30);
    const decision = alertDecision({
      family: args.modelFamily,
      feature: args.featureName,
      metric: args.metric,
      severity: args.severity,
      openFingerprints: open.map((row) => row.fingerprint),
      acknowledgedFingerprints: acknowledged.map((row) => row.fingerprint),
      consecutiveHits: args.consecutiveHits,
    });
    if (decision.action !== "open") return { action: decision.action, fingerprint: decision.fingerprint };
    await ctx.db.insert("mlDriftAlerts", {
      modelFamily: args.modelFamily,
      featureName: args.featureName.slice(0, 80),
      metric: args.metric.slice(0, 40),
      referencePeriod: args.referencePeriod.slice(0, 40),
      currentPeriod: args.currentPeriod.slice(0, 40),
      driftScore: args.driftScore,
      severity: args.severity,
      sampleSize: args.sampleSize,
      datasetVersion: args.datasetVersion.slice(0, 80),
      detectedAt: Date.now(),
      status: "open",
      fingerprint: decision.fingerprint,
      reason: "consecutive_windows",
    });
    return { action: "open" as const, fingerprint: decision.fingerprint };
  },
});

export const acknowledgeAlert = mutation({
  args: { fingerprint: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const [alert] = await ctx.db
      .query("mlDriftAlerts")
      .withIndex("by_fingerprint", (q) => q.eq("fingerprint", args.fingerprint))
      .take(1);
    if (!alert || alert.status !== "open") throw new ConvexError("alert_not_open");
    await ctx.db.patch(alert._id, { status: "acknowledged", acknowledgedBy: actorId(admin._id) });
    await writeAudit(ctx, {
      actor: actorId(admin._id),
      action: "acknowledge_alert",
      modelId: alert.modelFamily,
      outcome: "acknowledged",
      reason: alert.fingerprint,
    });
    return { status: "acknowledged" as const };
  },
});

export const resolveAlert = mutation({
  args: { fingerprint: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const [alert] = await ctx.db
      .query("mlDriftAlerts")
      .withIndex("by_fingerprint", (q) => q.eq("fingerprint", args.fingerprint))
      .take(1);
    if (!alert) throw new ConvexError("alert_not_open");
    await ctx.db.patch(alert._id, { status: "resolved" });
    await writeAudit(ctx, {
      actor: actorId(admin._id),
      action: "resolve_alert",
      modelId: alert.modelFamily,
      outcome: "resolved",
      reason: alert.fingerprint,
    });
    return { status: "resolved" as const };
  },
});

export const requestRetraining = mutation({
  args: {
    jobType: retrainJobValidator,
    datasetLabel: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const gate = gateFor(await settingValue(ctx, ENABLE_ML_RETRAINING_REQUESTS_KEY), MLOPS_RETRAINING_ENV);
    if (!gate.enabled) throw new ConvexError(gate.reason);
    const allow = assertAllowlistedJob(args.jobType);
    if (!allow.ok) throw new ConvexError(allow.reason);
    const family = JOB_FAMILY[args.jobType];
    const exportEnabled = process.env.DEMAND_FORECAST_EXPORT_ENABLED?.trim() === "true";
    const dataset = datasetAllowed(args.jobType, args.datasetLabel, exportEnabled);
    if (!dataset.ok) throw new ConvexError(dataset.reason);
    const open = await ctx.db
      .query("mlRetrainingJobs")
      .withIndex("by_family_state", (q) => q.eq("modelFamily", family))
      .take(20);
    if (duplicateRequest(open.map((row) => row.state))) throw new ConvexError("duplicate_request");
    const jobId = `${args.jobType}:${Date.now()}`;
    await ctx.db.insert("mlRetrainingJobs", {
      jobId,
      modelFamily: family,
      jobType: args.jobType,
      state: "requested",
      datasetLabel: args.datasetLabel,
      datasetReadiness: dataset.reason,
      requestedBy: actorId(admin._id),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      reason: args.reason.slice(0, 180),
      evaluationSummaryJson: "{}",
    });
    await writeAudit(ctx, {
      actor: actorId(admin._id),
      action: "request_retraining",
      modelId: family,
      outcome: "requested",
      reason: allow.entrypoint,
    });
    return { jobId, state: "requested" as const, executed: false as const };
  },
});

export const authorizeRetraining = mutation({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const job = await ctx.db
      .query("mlRetrainingJobs")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .unique();
    if (!job) throw new ConvexError("missing_job");
    const next = nextRetrainState(job.state, "authorized");
    if (!next.ok) throw new ConvexError(next.reason);
    await ctx.db.patch(job._id, {
      state: "authorized",
      authorizedBy: actorId(admin._id),
      updatedAt: Date.now(),
    });
    await writeAudit(ctx, {
      actor: actorId(admin._id),
      action: "authorize_retraining",
      modelId: job.modelFamily,
      outcome: "authorized",
      reason: job.jobType,
    });
    return { state: "authorized" as const, executed: false as const };
  },
});

export const cancelRetraining = mutation({
  args: { jobId: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const job = await ctx.db
      .query("mlRetrainingJobs")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .unique();
    if (!job) throw new ConvexError("missing_job");
    const next = nextRetrainState(job.state, "cancelled");
    if (!next.ok) throw new ConvexError(next.reason);
    await ctx.db.patch(job._id, {
      state: "cancelled",
      failureReason: args.reason.slice(0, 180),
      updatedAt: Date.now(),
    });
    await writeAudit(ctx, {
      actor: actorId(admin._id),
      action: "cancel_retraining",
      modelId: job.modelFamily,
      outcome: "cancelled",
      reason: args.reason,
    });
    return { state: "cancelled" as const };
  },
});

export const completeRetrainingReview = mutation({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const job = await ctx.db
      .query("mlRetrainingJobs")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .unique();
    if (!job) throw new ConvexError("missing_job");
    const next = completeReviewedJob(job.state);
    if (!next.ok) throw new ConvexError(next.reason);
    await ctx.db.patch(job._id, { state: "completed", updatedAt: Date.now() });
    await writeAudit(ctx, {
      actor: actorId(admin._id),
      action: "complete_retraining_review",
      modelId: job.candidateModelId ?? job.modelFamily,
      outcome: "completed",
      reason: "no_automatic_promotion",
    });
    return { state: "completed" as const, promoted: false as const };
  },
});

export const claimRetrainingJob = internalMutation({
  args: { workerId: v.string() },
  handler: async (ctx, args) => {
    if (!/^[a-z0-9-]{3,40}$/.test(args.workerId)) throw new ConvexError("worker_identity_required");
    const jobs = await ctx.db
      .query("mlRetrainingJobs")
      .withIndex("by_state", (q) => q.eq("state", "authorized"))
      .take(5);
    const job = jobs.find((row) => !row.claimedBy);
    if (!job) return null;
    const next = nextRetrainState(job.state, "preparing");
    if (!next.ok) throw new ConvexError(next.reason);
    await ctx.db.patch(job._id, {
      state: "preparing",
      claimedBy: args.workerId,
      updatedAt: Date.now(),
    });
    return { jobId: job.jobId, jobType: job.jobType, datasetLabel: job.datasetLabel };
  },
});

export const reportRetrainingJob = internalMutation({
  args: {
    jobId: v.string(),
    state: retrainStateValidator,
    failureReason: v.optional(v.string()),
    candidateModelId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("mlRetrainingJobs")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .unique();
    if (!job) throw new ConvexError("missing_job");
    const next = nextRetrainState(job.state, args.state as RetrainState);
    if (!next.ok) throw new ConvexError(next.reason);
    await ctx.db.patch(job._id, {
      state: args.state,
      failureReason: args.failureReason?.slice(0, 180),
      candidateModelId: args.candidateModelId?.slice(0, 120),
      updatedAt: Date.now(),
    });
    await writeAudit(ctx, {
      actor: job.claimedBy ? `worker:${job.claimedBy}` : "worker:unknown",
      action: "report_retraining",
      modelId: args.candidateModelId ?? job.modelFamily,
      outcome: args.state,
      reason: args.failureReason ?? "allowlisted_report",
    });
    return { state: args.state, promoted: false as const };
  },
});

export const pruneOperationalRows = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (process.env[MLOPS_MONITORING_ENV]?.trim() !== "true") return { pruned: 0 };
    const retention = parseRetentionDays(await settingValue(ctx, ML_MONITORING_RETENTION_DAYS_KEY));
    const today = new Date().toISOString().slice(0, 10);
    const buckets = await ctx.db.query("mlModelMonitoring").withIndex("by_bucket").take(25);
    let pruned = 0;
    for (const bucket of buckets) {
      if (bucketExpired(bucket.timeBucket, today, retention)) {
        await ctx.db.delete(bucket._id);
        pruned += 1;
      }
    }
    const audits = await ctx.db.query("mlModelAuditLogs").withIndex("by_created").take(25);
    const cutoff = Date.now() - retention * 86_400_000;
    for (const audit of audits) {
      if (audit.createdAt < cutoff) {
        await ctx.db.delete(audit._id);
        pruned += 1;
      }
    }
    return { pruned };
  },
});

export const monitoringGate = internalQuery({
  args: {},
  handler: async (ctx) => {
    return gateFor(await settingValue(ctx, ENABLE_MLOPS_MONITORING_KEY), MLOPS_MONITORING_ENV);
  },
});

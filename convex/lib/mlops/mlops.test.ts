import { describe, expect, it } from "vitest";
import { compareEvaluations, promotionGate, type EvaluationView } from "./evaluation";
import { alertDecision } from "./alerts";
import { foldMonitoring, emptyBucket, bucketExpired } from "./monitoring";
import { assertAllowlistedJob, datasetAllowed, duplicateRequest, nextRetrainState } from "./retraining";
import { assertMlopsSettingValue, parseRetentionDays, resolveOperationalGate } from "./config";

function ranking(version: string, ndcg: number, fingerprint = "same"): EvaluationView {
  return {
    modelFamily: "content",
    modelVersion: version,
    datasetFingerprint: fingerprint,
    datasetType: "authorized_historical",
    protocol: "leave_one_out",
    sampleCount: 40,
    metricKind: "ranking",
    metrics: { ndcg_at_k: ndcg, candidate_coverage: 0.8, latency_ms: 15 },
    horizonOrK: 10,
  };
}

describe("evaluation and gates", () => {
  it("compares matching protocols and refuses mixed metrics", () => {
    const compared = compareEvaluations(ranking("content-v1", 0.4), ranking("content-v2", 0.55));
    expect(compared.status).toBe("comparable");
    expect(compared.deltas.ndcg_at_k).toBeCloseTo(0.15);
    const mixed = compareEvaluations(ranking("content-v1", 0.4), {
      ...ranking("demand-forecast-v1", 1),
      metricKind: "forecast",
      metrics: { mae: 2 },
    });
    expect(mixed.status).toBe("not_comparable");
    expect(mixed.reasons).toContain("metric_kind");
    expect(compareEvaluations(ranking("a", 0.2, "one"), ranking("b", 0.2, "two")).status).toBe(
      "not_comparable"
    );
  });

  it("blocks synthetic promotion unless an admin explicitly accepts the limitation", () => {
    const synthetic: EvaluationView = { ...ranking("neural-v1", 0.4), datasetType: "synthetic" };
    expect(
      promotionGate({
        candidate: synthetic,
        baseline: null,
        acceptSynthetic: false,
        checksumOk: true,
        schemaOk: true,
        smokeOk: true,
      }).ok
    ).toBe(false);
    const accepted = promotionGate({
      candidate: synthetic,
      baseline: null,
      acceptSynthetic: true,
      checksumOk: true,
      schemaOk: true,
      smokeOk: true,
    });
    expect(accepted.ok).toBe(true);
    expect(accepted.reasons).toContain("synthetic_evidence_is_not_production_proof");
    const regressed = promotionGate({
      candidate: ranking("content-v2", 0.1),
      baseline: ranking("content-v1", 0.6),
      acceptSynthetic: false,
      checksumOk: true,
      schemaOk: true,
      smokeOk: true,
    });
    expect(regressed.reasons).toContain("ranking_regression");
  });
});

describe("alerts, monitoring, and retraining", () => {
  it("deduplicates alerts and waits for a second window", () => {
    const first = alertDecision({
      family: "content",
      feature: "price",
      metric: "psi",
      severity: "warning",
      openFingerprints: [],
      acknowledgedFingerprints: [],
      consecutiveHits: 2,
    });
    expect(first.action).toBe("open");
    expect(
      alertDecision({
        family: "content",
        feature: "price",
        metric: "psi",
        severity: "warning",
        openFingerprints: [first.fingerprint],
        acknowledgedFingerprints: [],
        consecutiveHits: 2,
      }).action
    ).toBe("duplicate");
    expect(
      alertDecision({
        family: "content",
        feature: "price",
        metric: "psi",
        severity: "warning",
        openFingerprints: [],
        acknowledgedFingerprints: [],
        consecutiveHits: 1,
      }).action
    ).toBe("awaiting_confirmation");
    expect(
      alertDecision({
        family: "content",
        feature: "price",
        metric: "psi",
        severity: "insufficient_data",
        openFingerprints: [],
        acknowledgedFingerprints: [],
        consecutiveHits: 5,
      }).action
    ).toBe("none");
  });

  it("folds counts without sensitive fields and expires old buckets", () => {
    let bucket = emptyBucket("content", "content-v1", "2026-01-01");
    bucket = foldMonitoring(bucket, { outcome: "success", latencyMs: 10 });
    bucket = foldMonitoring(bucket, { outcome: "failure", latencyMs: 40, errorCategory: "upstream" });
    bucket = foldMonitoring(bucket, { outcome: "fallback", latencyMs: 4 });
    expect(bucket.successCount).toBe(1);
    expect(bucket.failureCount).toBe(1);
    expect(bucket.fallbackCount).toBe(1);
    expect(bucket.latencyMaxMs).toBe(40);
    expect(() => foldMonitoring(bucket, { outcome: "success", latencyMs: 1 }, { email: "a@b.c" })).toThrow(
      /sensitive/
    );
    expect(bucketExpired("2026-01-01", "2026-03-15", 30)).toBe(true);
  });

  it("keeps retraining on an allowlist and refuses automatic completion", () => {
    expect(assertAllowlistedJob("content_retrain").ok).toBe(true);
    expect(assertAllowlistedJob("content_retrain", { shell: "echo" }).ok).toBe(false);
    expect(assertAllowlistedJob("rag_reindex").ok).toBe(false);
    expect(datasetAllowed("forecast_retrain", "authorized_aggregate", false).reason).toBe("export_gate");
    expect(datasetAllowed("collaborative_retrain", "visitor_level", true).reason).toBe(
      "visitor_export_forbidden"
    );
    expect(datasetAllowed("content_retrain", "synthetic", false).ok).toBe(true);
    expect(nextRetrainState("evaluating", "awaiting_approval").ok).toBe(true);
    expect(nextRetrainState("awaiting_approval", "completed").ok).toBe(false);
    expect(duplicateRequest(["authorized"])).toBe(true);
    expect(duplicateRequest(["cancelled"])).toBe(false);
  });

  it("requires both admin and deployment gates", () => {
    expect(resolveOperationalGate({ adminEnabled: true, deploymentGate: false }).reason).toBe(
      "deployment_gate"
    );
    expect(resolveOperationalGate({ adminEnabled: false, deploymentGate: true }).enabled).toBe(false);
    expect(resolveOperationalGate({ adminEnabled: true, deploymentGate: true }).enabled).toBe(true);
    expect(() => assertMlopsSettingValue("ml_monitoring_retention_days", "3")).toThrow(/7/);
    expect(parseRetentionDays("nope")).toBe(30);
  });
});

import { describe, expect, it } from "vitest";
import {
  applyEvaluation,
  applyValidation,
  beginApproval,
  canTransition,
  planActivation,
  planRollback,
  validateRegistration,
  type RegistryModel,
} from "./lifecycle";

function model(overrides: Partial<RegistryModel> = {}): RegistryModel {
  return {
    modelId: "content:content-v1:content-v1",
    modelFamily: "content",
    modelVersion: "content-v1",
    artifactVersion: "content-v1",
    featureSchemaVersion: "content-features-v1",
    datasetFingerprint: "fp",
    datasetType: "synthetic",
    artifactChecksum: "a".repeat(64),
    lifecycleStatus: "registered",
    artifactAvailability: "unknown",
    runtimeStatus: "not_activated",
    evaluationStatus: "missing",
    promotionInflight: false,
    registeredAt: 1,
    ...overrides,
  };
}

const registration = {
  modelFamily: "content",
  modelVersion: "content-v1",
  artifactVersion: "content-v1",
  featureSchemaVersion: "content-features-v1",
  datasetFingerprint: "fp",
  datasetType: "synthetic",
  artifactChecksum: "ab".repeat(32),
  trainingTimestamp: "2026-01-01T00:00:00Z",
  metadata: { serialization: "joblib" },
};

describe("model registry", () => {
  it("registers a model and rejects duplicates, bad families, and unsafe metadata", () => {
    const created = validateRegistration(registration, []);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(validateRegistration(registration, [created.modelId]).ok).toBe(false);
    expect(validateRegistration({ ...registration, modelFamily: "vision" }, []).ok).toBe(false);
    expect(
      validateRegistration({ ...registration, artifactChecksum: "nope" }, []).ok
    ).toBe(false);
    expect(
      validateRegistration(
        { ...registration, metadata: { path: "C:\\models\\secret.joblib" } },
        []
      ).ok
    ).toBe(false);
    expect(validateRegistration({ ...registration, modelVersion: "content-v2", artifactVersion: "b" }, [created.modelId]).ok).toBe(true);
  });

  it("follows the lifecycle and blocks a direct jump to active", () => {
    expect(canTransition("registered", "validated")).toBe(true);
    expect(canTransition("registered", "active")).toBe(false);
    expect(canTransition("evaluated", "approved")).toBe(true);
    const validated = applyValidation(model(), { ok: true, checksum: "a".repeat(64) });
    expect(validated.ok && validated.model.lifecycleStatus).toBe("validated");
    const failed = applyValidation(model(), { ok: false, checksum: "b".repeat(64) });
    expect(failed.ok && failed.model.lifecycleStatus).toBe("failed");
    const evaluated = applyEvaluation(
      model({ lifecycleStatus: "validated" }),
      "authorized_historical"
    );
    expect(evaluated.ok && evaluated.model.evaluationStatus).toBe("authorized_historical");
    expect(applyEvaluation(model(), "synthetic").ok).toBe(false);
  });

  it("rejects a second inflight promotion and does not activate from metadata alone", () => {
    const ready = model({
      lifecycleStatus: "evaluated",
      modelId: "content:content-v2:content-v2",
      registeredAt: 2,
    });
    const approved = beginApproval([ready], ready.modelId, true);
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const other = model({
      modelId: "content:content-v3:content-v3",
      modelVersion: "content-v3",
      artifactVersion: "content-v3",
      lifecycleStatus: "evaluated",
      registeredAt: 3,
    });
    expect(beginApproval([approved.model, other], other.modelId, true)).toEqual({
      ok: false,
      reason: "concurrent_promotion",
    });
    expect(beginApproval([ready], ready.modelId, false)).toEqual({ ok: false, reason: "quality_gate" });
    const activation = planActivation(approved.model, true);
    expect(activation.ok && activation.lifecycle).toBe("approved");
    expect(activation.ok && activation.runtime).toBe("pending_deployment");
    expect(activation.ok && activation.customerDeployment).toBe("not_changed");
    const missing = planActivation(approved.model, false);
    expect(missing.ok && missing.runtime).toBe("artifact_unavailable");
  });

  it("rolls back only when a compatible artifact is still available", () => {
    const previous = model({
      lifecycleStatus: "archived",
      artifactAvailability: "available",
      registeredAt: 1,
    });
    const current = model({
      modelId: "content:content-v2:content-v2",
      modelVersion: "content-v2",
      artifactVersion: "content-v2",
      lifecycleStatus: "approved",
      registeredAt: 2,
    });
    const plan = planRollback([previous, current], "content");
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.customerDeployment).toBe("not_changed");
    expect(plan.previousModelId).toBe(previous.modelId);
    expect(
      planRollback([{ ...previous, artifactAvailability: "unavailable" }, current], "content").ok
    ).toBe(false);
  });
});

/**
 * Reads the neural section of a shadow summary.
 * Missing data stays unavailable. Overlap is not treated as recommendation quality.
 */

export type NeuralShadowRecord = {
  recorded: boolean;
  modelAvailable: boolean;
  modelVersion: string | null;
  trainedAt: string | null;
  datasetFingerprint: string | null;
  scoreKind: string | null;
  validationLoss: number | null;
  evaluationWarning: string | null;
  errorCode: string | null;
  fallbackCount: number | null;
  latencyMs: number | null;
  validCandidateCount: number | null;
  overlapAtK: number | null;
  rankAgreement: number | null;
};

const EVALUATION_WARNING =
  "Offline neural metrics are not customer, conversion, or revenue performance. Agreement with the current ranker is not recommendation quality.";

export function emptyNeuralShadow(): NeuralShadowRecord {
  return {
    recorded: false,
    modelAvailable: false,
    modelVersion: null,
    trainedAt: null,
    datasetFingerprint: null,
    scoreKind: null,
    validationLoss: null,
    evaluationWarning: EVALUATION_WARNING,
    errorCode: null,
    fallbackCount: null,
    latencyMs: null,
    validCandidateCount: null,
    overlapAtK: null,
    rankAgreement: null,
  };
}

export function parseNeuralShadowSummary(summaryJson: string | undefined): NeuralShadowRecord {
  const empty = emptyNeuralShadow();
  if (!summaryJson) return empty;
  let payload: unknown;
  try {
    payload = JSON.parse(summaryJson);
  } catch {
    return empty;
  }
  if (!payload || typeof payload !== "object") return empty;
  const strategies = (payload as { strategies?: unknown }).strategies;
  if (!strategies || typeof strategies !== "object") return empty;
  const neural = (strategies as { neural?: unknown }).neural;
  if (!neural || typeof neural !== "object") return empty;
  const record = neural as Record<string, unknown>;
  return {
    recorded: true,
    modelAvailable: record.modelAvailable === true,
    modelVersion: text(record.modelVersion),
    trainedAt: text(record.trainedAt),
    datasetFingerprint: text(record.datasetFingerprint),
    scoreKind: text(record.scoreKind),
    validationLoss: numberOrNull(record.validationLoss),
    evaluationWarning: text(record.evaluationWarning) ?? EVALUATION_WARNING,
    errorCode: text(record.errorCode),
    fallbackCount: numberOrNull(record.fallbackCount),
    latencyMs: numberOrNull(record.latencyMs),
    validCandidateCount: numberOrNull(record.validCandidateCount),
    overlapAtK: numberOrNull(record.overlapAtK),
    rankAgreement: numberOrNull(record.rankAgreement),
  };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

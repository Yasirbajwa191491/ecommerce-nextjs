export const LOCAL_GATES = {
  minCandidateCoverage: 0.2,
  maxLatencyMs: 2000,
  maxNdcgRegression: 0.1,
  minRankingSamples: 20,
  maxMaeRelativeRegression: 0.5,
  maxAbsBias: 1,
  minBacktestSamples: 8,
} as const;

export type MetricKind = "ranking" | "forecast" | "retrieval";

export type EvaluationView = {
  modelFamily: string;
  modelVersion: string;
  datasetFingerprint: string;
  datasetType: string;
  protocol: string;
  sampleCount: number;
  metricKind: MetricKind;
  metrics: Record<string, number>;
  horizonOrK: number | null;
};

export type ComparisonResult = {
  status: "comparable" | "not_comparable";
  reasons: string[];
  deltas: Record<string, number>;
};

export function compareEvaluations(left: EvaluationView, right: EvaluationView): ComparisonResult {
  const reasons: string[] = [];
  if (left.metricKind !== right.metricKind) reasons.push("metric_kind");
  if (left.datasetFingerprint !== right.datasetFingerprint) reasons.push("dataset_fingerprint");
  if (left.protocol !== right.protocol) reasons.push("protocol");
  if (left.horizonOrK !== right.horizonOrK) reasons.push("horizon_or_k");
  if (left.datasetType !== right.datasetType) reasons.push("dataset_type");
  if (reasons.length > 0) return { status: "not_comparable", reasons, deltas: {} };
  const shared = Object.keys(left.metrics).filter((key) => key in right.metrics);
  const deltas: Record<string, number> = {};
  for (const key of shared) {
    deltas[key] = right.metrics[key] - left.metrics[key];
  }
  return { status: "comparable", reasons: [], deltas };
}

const METRIC_KEYS: Record<MetricKind, readonly string[]> = {
  ranking: [
    "precision_at_k",
    "recall_at_k",
    "hit_rate_at_k",
    "ndcg_at_k",
    "coverage",
    "candidate_coverage",
    "candidate_count",
    "latency_ms",
  ],
  forecast: ["mae", "rmse", "wape", "mase", "bias"],
  retrieval: ["recall_at_k", "mrr", "ndcg_at_k", "citation_validity"],
};

export function parseMetrics(
  kind: MetricKind,
  metrics: Record<string, number>
): { ok: true; metrics: Record<string, number> } | { ok: false; reason: string } {
  const allowed = new Set(METRIC_KEYS[kind]);
  const parsed: Record<string, number> = {};
  for (const [key, value] of Object.entries(metrics)) {
    if (!allowed.has(key) || !Number.isFinite(value)) return { ok: false, reason: "invalid_metric" };
    parsed[key] = value;
  }
  if (Object.keys(parsed).length === 0) return { ok: false, reason: "invalid_metric" };
  return { ok: true, metrics: parsed };
}

export function promotionGate(input: {
  candidate: EvaluationView;
  baseline: EvaluationView | null;
  acceptSynthetic: boolean;
  checksumOk: boolean;
  schemaOk: boolean;
  smokeOk: boolean;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.checksumOk) reasons.push("checksum");
  if (!input.schemaOk) reasons.push("feature_schema");
  if (!input.smokeOk) reasons.push("smoke_inference");
  if (input.candidate.datasetType === "synthetic" && !input.acceptSynthetic) {
    reasons.push("synthetic_evidence");
  }
  if (input.candidate.datasetType === "synthetic" && input.acceptSynthetic) {
    reasons.push("synthetic_evidence_is_not_production_proof");
  }
  if (input.candidate.metricKind === "ranking") {
    const coverage = input.candidate.metrics.candidate_coverage;
    const latency = input.candidate.metrics.latency_ms;
    if (input.candidate.sampleCount < LOCAL_GATES.minRankingSamples) reasons.push("sample_count");
    if (coverage === undefined || coverage < LOCAL_GATES.minCandidateCoverage) {
      reasons.push("candidate_coverage");
    }
    if (latency === undefined || latency > LOCAL_GATES.maxLatencyMs) reasons.push("latency");
    if (input.baseline) {
      const compared = compareEvaluations(input.baseline, input.candidate);
      if (compared.status !== "comparable") reasons.push("not_comparable");
      else if (-(compared.deltas.ndcg_at_k ?? 0) > LOCAL_GATES.maxNdcgRegression) {
        reasons.push("ranking_regression");
      }
    }
  } else if (input.candidate.metricKind === "forecast") {
    if (input.candidate.sampleCount < LOCAL_GATES.minBacktestSamples) reasons.push("sample_count");
    const bias = input.candidate.metrics.bias;
    if (bias === undefined || Math.abs(bias) > LOCAL_GATES.maxAbsBias) reasons.push("bias");
    if (input.baseline) {
      const compared = compareEvaluations(input.baseline, input.candidate);
      if (compared.status !== "comparable") reasons.push("not_comparable");
      else {
        const base = input.baseline.metrics.mae;
        const delta = compared.deltas.mae;
        if (base && delta !== undefined && base > 0 && delta / base > LOCAL_GATES.maxMaeRelativeRegression) {
          reasons.push("mae_regression");
        }
      }
    }
  } else if (input.candidate.metricKind === "retrieval") {
    reasons.push("retrieval_index_is_not_a_trained_model");
  } else {
    reasons.push("unsupported_metric_kind");
  }
  const blocking = reasons.filter((reason) => reason !== "synthetic_evidence_is_not_production_proof");
  return { ok: blocking.length === 0, reasons };
}

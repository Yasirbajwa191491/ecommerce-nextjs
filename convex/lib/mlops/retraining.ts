import { RETRAIN_JOB_TYPES, type RetrainJobType, type RetrainState } from "./validators";

const TRANSITIONS: Record<RetrainState, readonly RetrainState[]> = {
  requested: ["authorized", "cancelled"],
  authorized: ["preparing", "cancelled"],
  preparing: ["training", "failed", "cancelled"],
  training: ["evaluating", "failed", "cancelled"],
  evaluating: ["awaiting_approval", "failed"],
  awaiting_approval: ["completed", "cancelled", "failed"],
  completed: [],
  failed: [],
  cancelled: [],
};

const ENTRYPOINTS: Record<RetrainJobType, string> = {
  content_retrain: "training.train_recommendations",
  collaborative_retrain: "training.train_collaborative",
  neural_retrain: "training.train_neural",
  forecast_retrain: "training.train_demand_forecast",
  hybrid_config_refresh: "training.configure_hybrid",
};

const REJECTED = ["command", "shell", "module", "path", "env", "branch", "argv", "python"];

export function assertAllowlistedJob(
  jobType: string,
  extra: Record<string, unknown> = {}
): { ok: true; entrypoint: string } | { ok: false; reason: string } {
  if (REJECTED.some((key) => key in extra)) return { ok: false, reason: "arbitrary_command_rejected" };
  if (!RETRAIN_JOB_TYPES.includes(jobType as RetrainJobType)) {
    return { ok: false, reason: "job_type_not_allowlisted" };
  }
  return { ok: true, entrypoint: ENTRYPOINTS[jobType as RetrainJobType] };
}

export function datasetAllowed(
  jobType: RetrainJobType,
  datasetLabel: string,
  exportEnabled: boolean
): { ok: boolean; reason: string } {
  if (datasetLabel === "visitor_level" || datasetLabel === "raw_events" || datasetLabel === "emails") {
    return { ok: false, reason: "visitor_export_forbidden" };
  }
  if (datasetLabel === "synthetic") return { ok: true, reason: "synthetic" };
  if (jobType === "content_retrain" && datasetLabel === "product_metadata") {
    return { ok: true, reason: "product_metadata" };
  }
  if (jobType === "forecast_retrain" && datasetLabel === "authorized_aggregate") {
    if (!exportEnabled) return { ok: false, reason: "export_gate" };
    return { ok: true, reason: "authorized_aggregate" };
  }
  if (
    (jobType === "collaborative_retrain" || jobType === "neural_retrain") &&
    datasetLabel !== "synthetic"
  ) {
    return { ok: false, reason: "authorized_export_required" };
  }
  if (jobType === "hybrid_config_refresh" && datasetLabel === "configuration") {
    return { ok: true, reason: "configuration" };
  }
  return { ok: false, reason: "dataset_not_allowed" };
}

export function nextRetrainState(
  current: RetrainState,
  next: RetrainState
): { ok: true } | { ok: false; reason: string } {
  if (next === "completed") return { ok: false, reason: "completion_requires_human_approval" };
  if (!TRANSITIONS[current].includes(next)) return { ok: false, reason: "illegal_transition" };
  return { ok: true };
}

export function completeReviewedJob(
  current: RetrainState
): { ok: true; state: "completed" } | { ok: false; reason: string } {
  if (current !== "awaiting_approval") {
    return { ok: false, reason: "completion_requires_human_approval" };
  }
  return { ok: true, state: "completed" };
}

export function duplicateRequest(states: RetrainState[]): boolean {
  return states.some((state) => state !== "failed" && state !== "cancelled" && state !== "completed");
}

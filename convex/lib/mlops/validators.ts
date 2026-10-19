import { v } from "convex/values";

export const ML_FAMILIES = [
  "content",
  "collaborative",
  "hybrid",
  "neural",
  "demand_forecast",
  "rag_index",
] as const;

export type MlFamily = (typeof ML_FAMILIES)[number];

export const TRAINED_FAMILIES = [
  "content",
  "collaborative",
  "hybrid",
  "neural",
  "demand_forecast",
] as const;

export const LIFECYCLE_STATUSES = [
  "registered",
  "validated",
  "evaluated",
  "approved",
  "active",
  "rejected",
  "archived",
  "failed",
] as const;

export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

export const RUNTIME_STATUSES = [
  "not_activated",
  "pending_deployment",
  "artifact_unavailable",
  "active",
  "activation_failed",
] as const;

export type RuntimeStatus = (typeof RUNTIME_STATUSES)[number];

export const DATASET_TYPES = [
  "synthetic",
  "authorized_historical",
  "shadow",
  "live_monitoring",
  "not_applicable",
] as const;

export type DatasetType = (typeof DATASET_TYPES)[number];

export const RETRAIN_JOB_TYPES = [
  "content_retrain",
  "collaborative_retrain",
  "neural_retrain",
  "forecast_retrain",
  "hybrid_config_refresh",
] as const;

export type RetrainJobType = (typeof RETRAIN_JOB_TYPES)[number];

export const RETRAIN_STATES = [
  "requested",
  "authorized",
  "preparing",
  "training",
  "evaluating",
  "awaiting_approval",
  "completed",
  "failed",
  "cancelled",
] as const;

export type RetrainState = (typeof RETRAIN_STATES)[number];

export const mlFamilyValidator = v.union(
  v.literal("content"),
  v.literal("collaborative"),
  v.literal("hybrid"),
  v.literal("neural"),
  v.literal("demand_forecast"),
  v.literal("rag_index")
);

export const lifecycleValidator = v.union(
  v.literal("registered"),
  v.literal("validated"),
  v.literal("evaluated"),
  v.literal("approved"),
  v.literal("active"),
  v.literal("rejected"),
  v.literal("archived"),
  v.literal("failed")
);

export const runtimeStatusValidator = v.union(
  v.literal("not_activated"),
  v.literal("pending_deployment"),
  v.literal("artifact_unavailable"),
  v.literal("active"),
  v.literal("activation_failed")
);

export const artifactAvailabilityValidator = v.union(
  v.literal("unknown"),
  v.literal("available"),
  v.literal("unavailable"),
  v.literal("invalid")
);

export const evaluationStatusValidator = v.union(
  v.literal("missing"),
  v.literal("synthetic"),
  v.literal("authorized_historical"),
  v.literal("shadow"),
  v.literal("live_monitoring"),
  v.literal("not_measured")
);

export const datasetTypeValidator = v.union(
  v.literal("synthetic"),
  v.literal("authorized_historical"),
  v.literal("shadow"),
  v.literal("live_monitoring"),
  v.literal("not_applicable")
);

export const retrainStateValidator = v.union(
  v.literal("requested"),
  v.literal("authorized"),
  v.literal("preparing"),
  v.literal("training"),
  v.literal("evaluating"),
  v.literal("awaiting_approval"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled")
);

export const retrainJobValidator = v.union(
  v.literal("content_retrain"),
  v.literal("collaborative_retrain"),
  v.literal("neural_retrain"),
  v.literal("forecast_retrain"),
  v.literal("hybrid_config_refresh")
);

export const alertSeverityValidator = v.union(
  v.literal("normal"),
  v.literal("warning"),
  v.literal("critical"),
  v.literal("insufficient_data")
);

export const alertStatusValidator = v.union(
  v.literal("open"),
  v.literal("acknowledged"),
  v.literal("resolved")
);

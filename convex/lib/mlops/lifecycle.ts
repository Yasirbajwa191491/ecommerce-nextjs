import {
  DATASET_TYPES,
  LIFECYCLE_STATUSES,
  ML_FAMILIES,
  type DatasetType,
  type LifecycleStatus,
  type MlFamily,
  type RuntimeStatus,
} from "./validators";

const VERSION_PATTERNS: Record<MlFamily, RegExp> = {
  content: /^content-v[1-9]\d*$/,
  collaborative: /^collaborative-v[1-9]\d*$/,
  hybrid: /^hybrid-v[1-9]\d*$/,
  neural: /^neural-v[1-9]\d*$/,
  demand_forecast: /^demand-forecast-v[1-9]\d*$/,
  rag_index: /^rag-v[1-9]\d*$/,
};

const TRANSITIONS: Record<LifecycleStatus, readonly LifecycleStatus[]> = {
  registered: ["validated", "rejected", "failed"],
  validated: ["evaluated", "rejected", "failed"],
  evaluated: ["approved", "rejected", "failed"],
  approved: ["active", "rejected", "archived", "failed"],
  active: ["archived"],
  rejected: ["archived"],
  failed: ["archived"],
  archived: [],
};

export type RegistryModel = {
  modelId: string;
  modelFamily: MlFamily;
  modelVersion: string;
  artifactVersion: string;
  featureSchemaVersion: string;
  datasetFingerprint: string;
  datasetType: DatasetType;
  artifactChecksum: string;
  lifecycleStatus: LifecycleStatus;
  artifactAvailability: "unknown" | "available" | "unavailable" | "invalid";
  runtimeStatus: RuntimeStatus;
  evaluationStatus: string;
  promotionInflight: boolean;
  registeredAt: number;
};

export type RegistrationInput = {
  modelFamily: string;
  modelVersion: string;
  artifactVersion: string;
  featureSchemaVersion: string;
  datasetFingerprint: string;
  datasetType: string;
  artifactChecksum: string;
  trainingTimestamp: string;
  metadata: Record<string, string>;
};

const UNSAFE_METADATA = /"(path|file|filepath|command|token|secret|password)"|\\|\/\.\.|[A-Za-z]:\\/;

export function modelIdFor(family: string, modelVersion: string, artifactVersion: string): string {
  return `${family}:${modelVersion}:${artifactVersion}`;
}

export function assertTransition(from: LifecycleStatus, to: LifecycleStatus): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new Error(`Illegal lifecycle transition: ${from} -> ${to}`);
  }
}

export function canTransition(from: LifecycleStatus, to: LifecycleStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function validateRegistration(
  input: RegistrationInput,
  existingIds: string[]
): { ok: true; modelId: string } | { ok: false; reason: string } {
  if (!ML_FAMILIES.includes(input.modelFamily as MlFamily)) {
    return { ok: false, reason: "unsupported_family" };
  }
  const family = input.modelFamily as MlFamily;
  if (!VERSION_PATTERNS[family].test(input.modelVersion)) {
    return { ok: false, reason: "unsupported_version" };
  }
  if (!input.artifactVersion || input.artifactVersion.length > 80) {
    return { ok: false, reason: "invalid_metadata" };
  }
  if (!/^[a-f0-9]{64}$/.test(input.artifactChecksum)) {
    return { ok: false, reason: "invalid_checksum" };
  }
  if (!input.featureSchemaVersion || input.featureSchemaVersion.length > 80) {
    return { ok: false, reason: "invalid_metadata" };
  }
  if (!input.datasetFingerprint || input.datasetFingerprint.length > 120) {
    return { ok: false, reason: "invalid_metadata" };
  }
  if (!DATASET_TYPES.includes(input.datasetType as DatasetType)) {
    return { ok: false, reason: "invalid_metadata" };
  }
  if (UNSAFE_METADATA.test(JSON.stringify(input.metadata))) {
    return { ok: false, reason: "unsafe_metadata" };
  }
  const modelId = modelIdFor(family, input.modelVersion, input.artifactVersion);
  if (existingIds.includes(modelId)) return { ok: false, reason: "duplicate_version" };
  return { ok: true, modelId };
}

export function applyValidation(
  model: RegistryModel,
  report: { ok: boolean; checksum: string }
): { ok: true; model: RegistryModel } | { ok: false; reason: string } {
  if (model.lifecycleStatus !== "registered") {
    return { ok: false, reason: "illegal_transition" };
  }
  if (!report.ok || report.checksum !== model.artifactChecksum) {
    return {
      ok: true,
      model: {
        ...model,
        lifecycleStatus: "failed",
        artifactAvailability: "invalid",
        runtimeStatus: "not_activated",
      },
    };
  }
  return {
    ok: true,
    model: {
      ...model,
      lifecycleStatus: "validated",
      artifactAvailability: "available",
    },
  };
}

export function applyEvaluation(
  model: RegistryModel,
  datasetType: DatasetType
): { ok: true; model: RegistryModel } | { ok: false; reason: string } {
  if (model.lifecycleStatus !== "validated" && model.lifecycleStatus !== "evaluated") {
    return { ok: false, reason: "evaluation_requires_validation" };
  }
  const evaluationStatus = datasetType === "not_applicable" ? "not_measured" : datasetType;
  return {
    ok: true,
    model: { ...model, lifecycleStatus: "evaluated", evaluationStatus },
  };
}

export function beginApproval(
  models: RegistryModel[],
  modelId: string,
  gateOk: boolean
): { ok: true; model: RegistryModel } | { ok: false; reason: string } {
  const model = models.find((item) => item.modelId === modelId);
  if (!model) return { ok: false, reason: "missing_model" };
  if (models.some((item) => item.modelFamily === model.modelFamily && item.promotionInflight)) {
    return { ok: false, reason: "concurrent_promotion" };
  }
  if (model.lifecycleStatus !== "evaluated") return { ok: false, reason: "illegal_transition" };
  if (!gateOk) return { ok: false, reason: "quality_gate" };
  if (model.modelFamily === "rag_index") return { ok: false, reason: "retrieval_index_not_a_model" };
  return {
    ok: true,
    model: { ...model, lifecycleStatus: "approved", promotionInflight: true },
  };
}

export function planActivation(
  model: RegistryModel,
  artifactAvailable: boolean
):
  | {
      ok: true;
      lifecycle: LifecycleStatus;
      runtime: RuntimeStatus;
      customerDeployment: "not_changed";
    }
  | { ok: false; reason: string } {
  if (model.modelFamily === "rag_index") return { ok: false, reason: "retrieval_index_not_a_model" };
  if (model.lifecycleStatus !== "approved") return { ok: false, reason: "not_approved" };
  if (!artifactAvailable) {
    return {
      ok: true,
      lifecycle: "approved",
      runtime: "artifact_unavailable",
      customerDeployment: "not_changed",
    };
  }
  return {
    ok: true,
    lifecycle: "approved",
    runtime: "pending_deployment",
    customerDeployment: "not_changed",
  };
}

export function planRollback(
  models: RegistryModel[],
  family: MlFamily
):
  | {
      ok: true;
      currentModelId: string;
      previousModelId: string;
      customerDeployment: "not_changed";
      runtime: RuntimeStatus;
    }
  | { ok: false; reason: string; customerDeployment: "not_changed" } {
  const familyModels = models.filter((model) => model.modelFamily === family);
  const current = [...familyModels].sort((a, b) => b.registeredAt - a.registeredAt).find(
    (model) => model.lifecycleStatus === "active" || model.lifecycleStatus === "approved"
  );
  if (!current) return { ok: false, reason: "no_current_version", customerDeployment: "not_changed" };
  const previous = familyModels
    .filter(
      (model) =>
        model.modelId !== current.modelId &&
        model.featureSchemaVersion === current.featureSchemaVersion &&
        (model.lifecycleStatus === "archived" || model.lifecycleStatus === "approved")
    )
    .sort((a, b) => b.registeredAt - a.registeredAt)[0];
  if (!previous) return { ok: false, reason: "no_previous_version", customerDeployment: "not_changed" };
  if (previous.artifactAvailability !== "available") {
    return { ok: false, reason: "artifact_unavailable", customerDeployment: "not_changed" };
  }
  return {
    ok: true,
    currentModelId: current.modelId,
    previousModelId: previous.modelId,
    customerDeployment: "not_changed",
    runtime: "pending_deployment",
  };
}

export function lifecycleValues(): readonly LifecycleStatus[] {
  return LIFECYCLE_STATUSES;
}

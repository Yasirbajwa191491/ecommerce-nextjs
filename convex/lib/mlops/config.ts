import { isAdminRole } from "../authRoles";

export const ENABLE_MLOPS_MONITORING_KEY = "enable_mlops_monitoring";
export const ENABLE_ML_DRIFT_DETECTION_KEY = "enable_ml_drift_detection";
export const ENABLE_ML_RETRAINING_REQUESTS_KEY = "enable_ml_retraining_requests";
export const ML_MONITORING_RETENTION_DAYS_KEY = "ml_monitoring_retention_days";

export const MLOPS_MONITORING_ENV = "MLOPS_MONITORING_ENABLED";
export const MLOPS_DRIFT_ENV = "MLOPS_DRIFT_DETECTION_ENABLED";
export const MLOPS_RETRAINING_ENV = "MLOPS_RETRAINING_ENABLED";

export const RETENTION_MIN_DAYS = 7;
export const RETENTION_MAX_DAYS = 90;
export const RETENTION_DEFAULT_DAYS = 30;

export const MLOPS_SYSTEM_DEFAULTS: {
  key:
    | typeof ENABLE_MLOPS_MONITORING_KEY
    | typeof ENABLE_ML_DRIFT_DETECTION_KEY
    | typeof ENABLE_ML_RETRAINING_REQUESTS_KEY
    | typeof ML_MONITORING_RETENTION_DAYS_KEY;
  name: string;
  value: string;
}[] = [
  {
    key: ENABLE_MLOPS_MONITORING_KEY,
    name: "Enable MLOps Monitoring",
    value: "false",
  },
  {
    key: ENABLE_ML_DRIFT_DETECTION_KEY,
    name: "Enable Drift Detection",
    value: "false",
  },
  {
    key: ENABLE_ML_RETRAINING_REQUESTS_KEY,
    name: "Enable Retraining Requests",
    value: "false",
  },
  {
    key: ML_MONITORING_RETENTION_DAYS_KEY,
    name: "ML Monitoring Retention Days",
    value: String(RETENTION_DEFAULT_DAYS),
  },
];

export function isMlopsSettingKey(key: string): boolean {
  return MLOPS_SYSTEM_DEFAULTS.some((item) => item.key === key);
}

export function assertCanModifyMlopsSettings(role: string | null | undefined): void {
  if (!isAdminRole(role)) {
    throw new Error("Admin access required to update MLOps settings");
  }
}

export function parseMlopsEnabled(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function parseRetentionDays(value: string | null | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed) || parsed < RETENTION_MIN_DAYS || parsed > RETENTION_MAX_DAYS) {
    return RETENTION_DEFAULT_DAYS;
  }
  return parsed;
}

export function deploymentGateEnabled(value: string | undefined): boolean {
  return value?.trim() === "true";
}

export function assertMlopsSettingValue(key: string, value: string): void {
  const normalized = value.trim().toLowerCase();
  if (
    key === ENABLE_MLOPS_MONITORING_KEY ||
    key === ENABLE_ML_DRIFT_DETECTION_KEY ||
    key === ENABLE_ML_RETRAINING_REQUESTS_KEY
  ) {
    if (normalized !== "true" && normalized !== "false") {
      throw new Error("MLOps boolean settings must be true or false");
    }
    return;
  }
  if (key === ML_MONITORING_RETENTION_DAYS_KEY) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (!Number.isInteger(parsed) || parsed < RETENTION_MIN_DAYS || parsed > RETENTION_MAX_DAYS) {
      throw new Error(`Monitoring retention must be between ${RETENTION_MIN_DAYS} and ${RETENTION_MAX_DAYS} days`);
    }
  }
}

export function mlopsSettingFormError(key: string | undefined, value: string): string | undefined {
  if (!key || !isMlopsSettingKey(key)) return undefined;
  try {
    assertMlopsSettingValue(key, value);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid MLOps setting";
  }
}

export function resolveOperationalGate(input: {
  adminEnabled: boolean;
  deploymentGate: boolean;
}): { enabled: boolean; reason: string } {
  if (!input.adminEnabled) return { enabled: false, reason: "admin_disabled" };
  if (!input.deploymentGate) return { enabled: false, reason: "deployment_gate" };
  return { enabled: true, reason: "ready" };
}

import { isAdminRole } from "../authRoles";

/**
 * Python ML feature flags live in the existing `settings` table.
 * Service URL and API key stay in Convex environment variables and are never
 * stored or returned as setting values.
 */

export const ENABLE_PYTHON_ML_RECOMMENDATIONS_KEY = "enable_python_ml_recommendations";
export const PYTHON_ML_RECOMMENDATION_MODE_KEY = "python_ml_recommendation_mode";
export const PYTHON_ML_REQUEST_TIMEOUT_MS_KEY = "python_ml_request_timeout_ms";
export const PYTHON_ML_RECOMMENDATION_STRATEGY_KEY = "python_ml_recommendation_strategy";

export const PYTHON_ML_MODES = ["off", "shadow", "serve"] as const;
export type PythonMlMode = (typeof PYTHON_ML_MODES)[number];

export const PYTHON_ML_STRATEGIES = ["content", "collaborative", "hybrid", "neural"] as const;
export type PythonMlStrategy = (typeof PYTHON_ML_STRATEGIES)[number];

/** Inclusive bounds for `python_ml_request_timeout_ms`. */
export const PYTHON_ML_TIMEOUT_MIN_MS = 250;
export const PYTHON_ML_TIMEOUT_MAX_MS = 5000;
export const PYTHON_ML_TIMEOUT_DEFAULT_MS = 1500;

export const PYTHON_ML_SERVE_GATE_ENV = "PYTHON_ML_SERVE_ENABLED";
export const REDACTED_SETTING_VALUE = "[redacted]";

export const PYTHON_ML_SYSTEM_DEFAULTS: {
  key:
    | typeof ENABLE_PYTHON_ML_RECOMMENDATIONS_KEY
    | typeof PYTHON_ML_RECOMMENDATION_MODE_KEY
    | typeof PYTHON_ML_REQUEST_TIMEOUT_MS_KEY
    | typeof PYTHON_ML_RECOMMENDATION_STRATEGY_KEY;
  name: string;
  value: string;
}[] = [
  {
    key: ENABLE_PYTHON_ML_RECOMMENDATIONS_KEY,
    name: "Enable Python ML Recommendations",
    value: "false",
  },
  {
    key: PYTHON_ML_RECOMMENDATION_MODE_KEY,
    name: "Python ML Recommendation Mode",
    value: "off",
  },
  {
    key: PYTHON_ML_REQUEST_TIMEOUT_MS_KEY,
    name: "Python ML Request Timeout (ms)",
    value: String(PYTHON_ML_TIMEOUT_DEFAULT_MS),
  },
  {
    key: PYTHON_ML_RECOMMENDATION_STRATEGY_KEY,
    name: "Python ML Recommendation Strategy",
    value: "content",
  },
];

const CREDENTIAL_SETTING_KEYS = new Set([
  "python_ai_service_url",
  "python_ai_service_api_key",
  "ai_service_api_key",
  "ai_service_api_key_previous",
  "convex_service_token",
  "catalog_export_token",
]);

const CREDENTIAL_KEY_PATTERN =
  /(^|_)(api_key|apikey|password|credential|auth_token|service_token|private_key|access_token)($|_)/;

const CREDENTIAL_VALUE_PATTERN =
  /PYTHON_AI_SERVICE_URL|PYTHON_AI_SERVICE_API_KEY|AI_SERVICE_API_KEY|CONVEX_SERVICE_TOKEN|CATALOG_EXPORT_TOKEN|Bearer\s+[A-Za-z0-9._~+/-]+=*/;

export type PythonMlStoredInput = {
  enabledRaw?: string | null;
  modeRaw?: string | null;
  timeoutRaw?: string | null;
  strategyRaw?: string | null;
  modelAvailable?: boolean;
  modelCompatible?: boolean;
} | null;

export type PythonServiceSignals = {
  serviceConfigured: boolean;
  credentialsPresent: boolean;
  serveGateEnabled: boolean;
};

export type PythonMlEffectiveConfig = {
  enabled: boolean;
  storedMode: PythonMlMode;
  effectiveMode: PythonMlMode;
  timeoutMs: number;
  strategy: PythonMlStrategy;
  mayRun: boolean;
  mayAffectCustomers: boolean;
  customerVisibleSource: "existing" | "python_ml";
};

export function isPythonMlSettingKey(key: string): boolean {
  return (
    key === ENABLE_PYTHON_ML_RECOMMENDATIONS_KEY ||
    key === PYTHON_ML_RECOMMENDATION_MODE_KEY ||
    key === PYTHON_ML_REQUEST_TIMEOUT_MS_KEY ||
    key === PYTHON_ML_RECOMMENDATION_STRATEGY_KEY
  );
}

export function canModifyPythonMlSettings(role: string | null | undefined): boolean {
  return isAdminRole(role);
}

export function assertCanModifyPythonMlSettings(role: string | null | undefined): void {
  if (!canModifyPythonMlSettings(role)) {
    throw new Error("Admin access required to update Python ML settings");
  }
}

export function isCredentialSettingKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  if (CREDENTIAL_SETTING_KEYS.has(normalized)) return true;
  return CREDENTIAL_KEY_PATTERN.test(normalized);
}

export function valueContainsServiceCredential(value: string): boolean {
  return CREDENTIAL_VALUE_PATTERN.test(value);
}

export function assertSettingHasNoCredentials(key: string, value: string): void {
  if (isCredentialSettingKey(key) || valueContainsServiceCredential(value)) {
    throw new Error("Settings cannot store service credentials");
  }
}

export function redactAdminSetting<T extends { key: string; value: string }>(row: T): T {
  if (!isCredentialSettingKey(row.key) && !valueContainsServiceCredential(row.value)) {
    return row;
  }
  return { ...row, value: REDACTED_SETTING_VALUE };
}

export function redactAdminSettings<T extends { key: string; value: string }>(rows: T[]): T[] {
  return rows.map(redactAdminSetting);
}

export function parsePythonMlEnabled(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function parsePythonMlMode(value: string | null | undefined): PythonMlMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "off" || normalized === "shadow" || normalized === "serve") {
    return normalized;
  }
  return "off";
}

export function parsePythonMlStrategy(value: string | null | undefined): PythonMlStrategy {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "content" ||
    normalized === "collaborative" ||
    normalized === "hybrid" ||
    normalized === "neural"
  ) {
    return normalized;
  }
  return "content";
}

export function parsePythonMlTimeoutMs(value: string | null | undefined): number {
  const raw = value?.trim() ?? "";
  if (!/^\d+$/.test(raw)) return PYTHON_ML_TIMEOUT_DEFAULT_MS;
  const parsed = Number.parseInt(raw, 10);
  if (parsed < PYTHON_ML_TIMEOUT_MIN_MS || parsed > PYTHON_ML_TIMEOUT_MAX_MS) {
    return PYTHON_ML_TIMEOUT_DEFAULT_MS;
  }
  return parsed;
}

export function assertPythonMlSettingValue(key: string, value: string): void {
  if (key === ENABLE_PYTHON_ML_RECOMMENDATIONS_KEY) {
    const normalized = value.trim().toLowerCase();
    if (normalized !== "true" && normalized !== "false") {
      throw new Error("Enable Python ML Recommendations must be true or false");
    }
  }
  if (key === PYTHON_ML_RECOMMENDATION_MODE_KEY) {
    const normalized = value.trim().toLowerCase();
    if (normalized !== "off" && normalized !== "shadow" && normalized !== "serve") {
      throw new Error("Python ML recommendation mode must be off, shadow, or serve");
    }
  }
  if (key === PYTHON_ML_RECOMMENDATION_STRATEGY_KEY) {
    const normalized = value.trim().toLowerCase();
    if (
      normalized !== "content" &&
      normalized !== "collaborative" &&
      normalized !== "hybrid" &&
      normalized !== "neural"
    ) {
      throw new Error(
        "Python ML recommendation strategy must be content, collaborative, hybrid, or neural"
      );
    }
  }
  if (key === PYTHON_ML_REQUEST_TIMEOUT_MS_KEY) {
    if (!/^\d+$/.test(value.trim())) {
      throw new Error(
        `Python ML request timeout must be an integer between ${PYTHON_ML_TIMEOUT_MIN_MS} and ${PYTHON_ML_TIMEOUT_MAX_MS} milliseconds`
      );
    }
    const parsed = Number.parseInt(value.trim(), 10);
    if (parsed < PYTHON_ML_TIMEOUT_MIN_MS || parsed > PYTHON_ML_TIMEOUT_MAX_MS) {
      throw new Error(
        `Python ML request timeout must be an integer between ${PYTHON_ML_TIMEOUT_MIN_MS} and ${PYTHON_ML_TIMEOUT_MAX_MS} milliseconds`
      );
    }
  }
}

export function pythonMlSettingFormError(key: string | undefined, value: string): string | undefined {
  if (!key || !isPythonMlSettingKey(key)) return undefined;
  try {
    assertPythonMlSettingValue(key, value.trim());
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid Python ML setting";
  }
}

export type PythonServiceEnv = {
  PYTHON_AI_SERVICE_URL?: string;
  PYTHON_AI_SERVICE_API_KEY?: string;
  PYTHON_ML_SERVE_ENABLED?: string;
  [key: string]: string | undefined;
};

export function readPythonServiceSignals(env: PythonServiceEnv): PythonServiceSignals {
  return {
    serviceConfigured: isConfiguredServiceUrl(env.PYTHON_AI_SERVICE_URL),
    credentialsPresent: (env.PYTHON_AI_SERVICE_API_KEY?.trim() ?? "").length > 0,
    serveGateEnabled: env.PYTHON_ML_SERVE_ENABLED?.trim().toLowerCase() === "true",
  };
}

function isConfiguredServiceUrl(raw: string | undefined): boolean {
  const value = raw?.trim() ?? "";
  if (!value) return false;
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) return false;
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

const RUNTIME_OFF: PythonServiceSignals = {
  serviceConfigured: false,
  credentialsPresent: false,
  serveGateEnabled: false,
};

export function resolvePythonMlEffectiveConfig(
  stored: PythonMlStoredInput,
  signals: PythonServiceSignals = RUNTIME_OFF,
  pythonCall?: { ok: boolean } | null
): PythonMlEffectiveConfig {
  const enabled = parsePythonMlEnabled(stored?.enabledRaw);
  const storedMode = parsePythonMlMode(stored?.modeRaw);
  const effectiveMode: PythonMlMode = enabled ? storedMode : "off";
  const timeoutMs = parsePythonMlTimeoutMs(stored?.timeoutRaw);
  const strategy = parsePythonMlStrategy(stored?.strategyRaw);
  const modelReady = stored?.modelAvailable === true && stored?.modelCompatible === true;
  const runtimeReady = signals.serviceConfigured && signals.credentialsPresent && modelReady;
  const mayRun =
    runtimeReady &&
    (effectiveMode === "shadow" || (effectiveMode === "serve" && signals.serveGateEnabled));
  const mayAffectCustomers = mayRun && effectiveMode === "serve" && pythonCall?.ok === true;
  return {
    enabled,
    storedMode,
    effectiveMode,
    timeoutMs,
    strategy,
    mayRun,
    mayAffectCustomers,
    customerVisibleSource: mayAffectCustomers ? "python_ml" : "existing",
  };
}

/**
 * Background jobs keep the Convex processor. Reading the effective config does
 * not let a stored `serve` mode publish Python results from the job.
 */
export function recommendationJobProcessor(
  decision: Pick<PythonMlEffectiveConfig, "customerVisibleSource" | "mayAffectCustomers">
): "convex" {
  void decision.customerVisibleSource;
  void decision.mayAffectCustomers;
  return "convex";
}

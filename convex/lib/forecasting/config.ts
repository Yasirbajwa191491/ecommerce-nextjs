import { isAdminRole } from "../authRoles";

export const ENABLE_DEMAND_FORECASTING_KEY = "enable_demand_forecasting";
export const DEMAND_FORECAST_HORIZON_DAYS_KEY = "demand_forecast_horizon_days";
export const DEMAND_FORECAST_MODEL_STRATEGY_KEY = "demand_forecast_model_strategy";
export const DEMAND_FORECAST_SHOW_UNCERTAINTY_KEY = "demand_forecast_show_uncertainty";

export const FORECAST_HORIZONS = [7, 14, 30] as const;
export type ForecastHorizon = (typeof FORECAST_HORIZONS)[number];

export const FORECAST_STRATEGIES = [
  "auto",
  "naive",
  "seasonal_naive",
  "moving_average",
  "exponential_smoothing",
  "ml_regression",
  "intermittent",
] as const;
export type ForecastStrategy = (typeof FORECAST_STRATEGIES)[number];

export const FORECAST_MODEL_VERSION = "demand-forecast-v1";
export const FORECAST_DEPLOYMENT_GATE_ENV = "DEMAND_FORECASTING_ENABLED";
export const FORECAST_EXPORT_GATE_ENV = "DEMAND_FORECAST_EXPORT_ENABLED";

export const FORECAST_SYSTEM_DEFAULTS: {
  key:
    | typeof ENABLE_DEMAND_FORECASTING_KEY
    | typeof DEMAND_FORECAST_HORIZON_DAYS_KEY
    | typeof DEMAND_FORECAST_MODEL_STRATEGY_KEY
    | typeof DEMAND_FORECAST_SHOW_UNCERTAINTY_KEY;
  name: string;
  value: string;
}[] = [
  {
    key: ENABLE_DEMAND_FORECASTING_KEY,
    name: "Enable Demand Forecasting",
    value: "false",
  },
  {
    key: DEMAND_FORECAST_HORIZON_DAYS_KEY,
    name: "Forecast Horizon",
    value: "14",
  },
  {
    key: DEMAND_FORECAST_MODEL_STRATEGY_KEY,
    name: "Forecast Model Strategy",
    value: "auto",
  },
  {
    key: DEMAND_FORECAST_SHOW_UNCERTAINTY_KEY,
    name: "Forecast Confidence Display",
    value: "true",
  },
];

export function isForecastSettingKey(key: string): boolean {
  return FORECAST_SYSTEM_DEFAULTS.some((item) => item.key === key);
}

export function assertCanModifyForecastSettings(role: string | null | undefined): void {
  if (!isAdminRole(role)) {
    throw new Error("Admin access required to update demand forecasting settings");
  }
}

export function parseForecastEnabled(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function parseForecastHorizon(value: string | null | undefined): ForecastHorizon {
  const parsed = Number.parseInt(value ?? "", 10);
  if (parsed === 7 || parsed === 14 || parsed === 30) return parsed;
  return 14;
}

export function parseForecastStrategy(value: string | null | undefined): ForecastStrategy {
  const normalized = value?.trim().toLowerCase();
  if (FORECAST_STRATEGIES.includes(normalized as ForecastStrategy)) {
    return normalized as ForecastStrategy;
  }
  return "auto";
}

export function deploymentGateEnabled(value: string | undefined): boolean {
  return value?.trim() === "true";
}

export function assertForecastSettingValue(key: string, value: string): void {
  const normalized = value.trim().toLowerCase();
  if (key === ENABLE_DEMAND_FORECASTING_KEY || key === DEMAND_FORECAST_SHOW_UNCERTAINTY_KEY) {
    if (normalized !== "true" && normalized !== "false") {
      throw new Error("Demand forecasting boolean settings must be true or false");
    }
    return;
  }
  if (key === DEMAND_FORECAST_HORIZON_DAYS_KEY) {
    if (normalized !== "7" && normalized !== "14" && normalized !== "30") {
      throw new Error("Forecast horizon must be 7, 14, or 30");
    }
    return;
  }
  if (key === DEMAND_FORECAST_MODEL_STRATEGY_KEY && !FORECAST_STRATEGIES.includes(normalized as ForecastStrategy)) {
    throw new Error("Forecast model strategy is not supported");
  }
}

export function forecastSettingFormError(key: string | undefined, value: string): string | undefined {
  if (!key || !isForecastSettingKey(key)) return undefined;
  try {
    assertForecastSettingValue(key, value);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid demand forecasting setting";
  }
}

export function resolveForecastAvailability(input: {
  adminEnabled: boolean;
  deploymentGate: boolean;
  exportGate: boolean;
  serviceConfigured: boolean;
  artifactReady: boolean;
  published: boolean;
}): { enabled: boolean; reason: string } {
  if (!input.adminEnabled) return { enabled: false, reason: "admin_disabled" };
  if (!input.deploymentGate) return { enabled: false, reason: "deployment_gate" };
  if (!input.exportGate) return { enabled: false, reason: "export_gate" };
  if (!input.serviceConfigured) return { enabled: false, reason: "service_unconfigured" };
  if (!input.artifactReady) return { enabled: false, reason: "artifact_missing" };
  if (!input.published) return { enabled: false, reason: "forecast_unpublished" };
  return { enabled: true, reason: "ready" };
}

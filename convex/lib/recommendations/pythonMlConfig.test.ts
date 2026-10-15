import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { RECOMMENDATION_SYSTEM_DEFAULTS } from "./constants";
import {
  ENABLE_PYTHON_ML_RECOMMENDATIONS_KEY,
  PYTHON_ML_RECOMMENDATION_MODE_KEY,
  PYTHON_ML_REQUEST_TIMEOUT_MS_KEY,
  PYTHON_ML_RECOMMENDATION_STRATEGY_KEY,
  PYTHON_ML_SYSTEM_DEFAULTS,
  PYTHON_ML_TIMEOUT_DEFAULT_MS,
  REDACTED_SETTING_VALUE,
  assertCanModifyPythonMlSettings,
  assertPythonMlSettingValue,
  assertSettingHasNoCredentials,
  canModifyPythonMlSettings,
  parsePythonMlMode,
  pythonMlSettingFormError,
  readPythonServiceSignals,
  recommendationJobProcessor,
  redactAdminSettings,
  resolvePythonMlEffectiveConfig,
  type PythonMlEffectiveConfig,
  type PythonServiceSignals,
} from "./pythonMlConfig";

const convexDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const readyService: PythonServiceSignals = {
  serviceConfigured: true,
  credentialsPresent: true,
  serveGateEnabled: false,
};

const readyModel = {
  modelAvailable: true,
  modelCompatible: true,
};

function resolve(
  stored: {
    enabledRaw?: string | null;
    modeRaw?: string | null;
    timeoutRaw?: string | null;
    strategyRaw?: string | null;
    modelAvailable?: boolean;
    modelCompatible?: boolean;
  } | null,
  signals: PythonServiceSignals = readyService,
  pythonCall?: { ok: boolean } | null
): PythonMlEffectiveConfig {
  return resolvePythonMlEffectiveConfig(stored, signals, pythonCall);
}

describe("python ML admin settings", () => {
  it("defaults to disabled", () => {
    expect(PYTHON_ML_SYSTEM_DEFAULTS).toEqual([
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
        value: "1500",
      },
      {
        key: PYTHON_ML_RECOMMENDATION_STRATEGY_KEY,
        name: "Python ML Recommendation Strategy",
        value: "content",
      },
    ]);
    const config = resolve(null);
    expect(config.enabled).toBe(false);
    expect(config.effectiveMode).toBe("off");
    expect(config.timeoutMs).toBe(PYTHON_ML_TIMEOUT_DEFAULT_MS);
    expect(config.strategy).toBe("content");
    expect(config.mayRun).toBe(false);
    expect(config.customerVisibleSource).toBe("existing");
  });

  it("turns the enable flag on and off without changing the stored mode", () => {
    const disabled = resolve({
      enabledRaw: "false",
      modeRaw: "shadow",
      timeoutRaw: "1500",
      ...readyModel,
    });
    expect(disabled.enabled).toBe(false);
    expect(disabled.storedMode).toBe("shadow");
    expect(disabled.effectiveMode).toBe("off");
    expect(disabled.mayRun).toBe(false);

    const serveWhileDisabled = resolve(
      {
        enabledRaw: "false",
        modeRaw: "serve",
        timeoutRaw: "1500",
        ...readyModel,
      },
      { ...readyService, serveGateEnabled: true },
      { ok: true }
    );
    expect(serveWhileDisabled.storedMode).toBe("serve");
    expect(serveWhileDisabled.effectiveMode).toBe("off");
    expect(serveWhileDisabled.customerVisibleSource).toBe("existing");

    const enabled = resolve({
      enabledRaw: "true",
      modeRaw: "shadow",
      timeoutRaw: "1500",
      ...readyModel,
    });
    expect(enabled.enabled).toBe(true);
    expect(enabled.effectiveMode).toBe("shadow");
    expect(enabled.mayRun).toBe(true);
  });

  it("accepts off, shadow, and serve and rejects other modes", () => {
    expect(parsePythonMlMode("off")).toBe("off");
    expect(parsePythonMlMode("shadow")).toBe("shadow");
    expect(parsePythonMlMode("serve")).toBe("serve");
    expect(parsePythonMlMode(" Shadow ")).toBe("shadow");
    expect(() => assertPythonMlSettingValue(PYTHON_ML_RECOMMENDATION_MODE_KEY, "off")).not.toThrow();
    expect(() => assertPythonMlSettingValue(PYTHON_ML_RECOMMENDATION_MODE_KEY, "shadow")).not.toThrow();
    expect(() => assertPythonMlSettingValue(PYTHON_ML_RECOMMENDATION_MODE_KEY, "serve")).not.toThrow();
    expect(() => assertPythonMlSettingValue(PYTHON_ML_RECOMMENDATION_MODE_KEY, "hybrid")).toThrow(
      /off, shadow, or serve/
    );
    expect(pythonMlSettingFormError(PYTHON_ML_RECOMMENDATION_MODE_KEY, "live")).toMatch(
      /off, shadow, or serve/
    );
  });

  it("keeps the python model strategy on content unless an admin selects another", () => {
    expect(resolve(null).strategy).toBe("content");
    expect(resolve({ strategyRaw: "hybrid" }).strategy).toBe("hybrid");
    expect(resolve({ strategyRaw: " Collaborative " }).strategy).toBe("collaborative");
    expect(resolve({ strategyRaw: "python_content" }).strategy).toBe("content");
    expect(() =>
      assertPythonMlSettingValue(PYTHON_ML_RECOMMENDATION_STRATEGY_KEY, "collaborative")
    ).not.toThrow();
    expect(() =>
      assertPythonMlSettingValue(PYTHON_ML_RECOMMENDATION_STRATEGY_KEY, "python_content")
    ).toThrow(/content, collaborative, or hybrid/);
    expect(resolve({ enabledRaw: "false", modeRaw: "serve", strategyRaw: "hybrid" }).mayAffectCustomers).toBe(
      false
    );
  });

  it("rejects invalid timeout and boolean values", () => {
    expect(() => assertPythonMlSettingValue(PYTHON_ML_REQUEST_TIMEOUT_MS_KEY, "0")).toThrow(
      /250 and 5000/
    );
    expect(() => assertPythonMlSettingValue(PYTHON_ML_REQUEST_TIMEOUT_MS_KEY, "1500.5")).toThrow(
      /250 and 5000/
    );
    expect(() => assertPythonMlSettingValue(PYTHON_ML_REQUEST_TIMEOUT_MS_KEY, "6000")).toThrow(
      /250 and 5000/
    );
    expect(() => assertPythonMlSettingValue(PYTHON_ML_REQUEST_TIMEOUT_MS_KEY, "1500")).not.toThrow();
    expect(() =>
      assertPythonMlSettingValue(ENABLE_PYTHON_ML_RECOMMENDATIONS_KEY, "yes")
    ).toThrow(/true or false/);
    expect(pythonMlSettingFormError(PYTHON_ML_REQUEST_TIMEOUT_MS_KEY, "fast")).toMatch(/250 and 5000/);
  });

  it("falls back when a setting is missing or invalid", () => {
    const config = resolve({
      enabledRaw: "yes",
      modeRaw: "hybrid",
      timeoutRaw: "nope",
      modelAvailable: true,
      modelCompatible: false,
    });
    expect(config.enabled).toBe(false);
    expect(config.storedMode).toBe("off");
    expect(config.effectiveMode).toBe("off");
    expect(config.timeoutMs).toBe(1500);
    expect(config.mayRun).toBe(false);

    const missing = resolve({});
    expect(missing.effectiveMode).toBe("off");
    expect(missing.timeoutMs).toBe(1500);
  });

  it("leaves existing recommendation settings unchanged", () => {
    const keys = RECOMMENDATION_SYSTEM_DEFAULTS.map((item) => item.key);
    expect(keys).not.toContain(ENABLE_PYTHON_ML_RECOMMENDATIONS_KEY);
    expect(keys).not.toContain(PYTHON_ML_RECOMMENDATION_MODE_KEY);
    expect(keys).not.toContain(PYTHON_ML_REQUEST_TIMEOUT_MS_KEY);
    expect(keys).not.toContain(PYTHON_ML_RECOMMENDATION_STRATEGY_KEY);
    expect(RECOMMENDATION_SYSTEM_DEFAULTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "recommendation_ai_enabled", value: "true" }),
        expect.objectContaining({ key: "recommendation_personalization_enabled", value: "true" }),
        expect.objectContaining({ key: "recommendation_hybrid_enabled", value: "true" }),
        expect.objectContaining({ key: "recommendation_n8n_enabled", value: "false" }),
        expect.objectContaining({ key: "recommendation_strategy", value: "convex" }),
        expect.objectContaining({ key: "recommendation_strategy_fallback", value: "convex" }),
        expect.objectContaining({ key: "recommendation_python_model_version", value: "content-v1" }),
      ])
    );
  });

  it("refuses Python ML setting updates from anyone who is not an admin", () => {
    expect(canModifyPythonMlSettings(null)).toBe(false);
    expect(canModifyPythonMlSettings(undefined)).toBe(false);
    expect(canModifyPythonMlSettings("user")).toBe(false);
    expect(canModifyPythonMlSettings("admin")).toBe(true);
    expect(canModifyPythonMlSettings("superAdmin")).toBe(true);
    expect(() => assertCanModifyPythonMlSettings("user")).toThrow(/Admin access required/);
    expect(() => assertCanModifyPythonMlSettings("admin")).not.toThrow();
  });

  it("keeps secrets out of admin setting responses", () => {
    const secret = "python-service-key-should-not-leak";
    const rows = redactAdminSettings([
      { key: "store_name", value: "Ecommerce Store" },
      { key: ENABLE_PYTHON_ML_RECOMMENDATIONS_KEY, value: "false" },
      { key: PYTHON_ML_RECOMMENDATION_MODE_KEY, value: "off" },
      { key: PYTHON_ML_REQUEST_TIMEOUT_MS_KEY, value: "1500" },
      { key: "python_ai_service_api_key", value: secret },
      { key: "python_ai_service_url", value: "https://ai.internal.example" },
      { key: "note", value: `Bearer ${secret}` },
      { key: "catalog_export_token", value: secret },
    ]);
    const serialized = JSON.stringify(rows);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("ai.internal.example");
    expect(serialized).not.toContain("PYTHON_AI_SERVICE_API_KEY");
    expect(rows.find((row) => row.key === "python_ai_service_api_key")?.value).toBe(
      REDACTED_SETTING_VALUE
    );
    expect(rows.find((row) => row.key === "store_name")?.value).toBe("Ecommerce Store");
    expect(() => assertSettingHasNoCredentials("python_ai_service_api_key", "false")).toThrow(
      /cannot store service credentials/
    );
    expect(() => assertSettingHasNoCredentials("store_name", `Bearer ${secret}`)).toThrow(
      /cannot store service credentials/
    );

    const signals = readPythonServiceSignals({
      PYTHON_AI_SERVICE_URL: "https://ai.example.com",
      PYTHON_AI_SERVICE_API_KEY: secret,
      PYTHON_ML_SERVE_ENABLED: "false",
    });
    expect(signals).toEqual({
      serviceConfigured: true,
      credentialsPresent: true,
      serveGateEnabled: false,
    });
    expect(JSON.stringify(signals)).not.toContain(secret);
    expect(JSON.stringify(PYTHON_ML_SYSTEM_DEFAULTS)).not.toContain("PYTHON_AI_SERVICE");
  });

  it("does not change customer-visible recommendations in shadow mode", () => {
    const config = resolve(
      {
        enabledRaw: "true",
        modeRaw: "shadow",
        timeoutRaw: "1500",
        ...readyModel,
      },
      readyService,
      { ok: true }
    );
    expect(config.effectiveMode).toBe("shadow");
    expect(config.mayRun).toBe(true);
    expect(config.mayAffectCustomers).toBe(false);
    expect(config.customerVisibleSource).toBe("existing");
    expect(recommendationJobProcessor(config)).toBe("convex");
  });

  it("does not let serve mode bypass the deployment safety gate", () => {
    const blocked = resolve(
      {
        enabledRaw: "true",
        modeRaw: "serve",
        timeoutRaw: "1500",
        ...readyModel,
      },
      { ...readyService, serveGateEnabled: false },
      { ok: true }
    );
    expect(blocked.effectiveMode).toBe("serve");
    expect(blocked.mayRun).toBe(false);
    expect(blocked.mayAffectCustomers).toBe(false);
    expect(blocked.customerVisibleSource).toBe("existing");
    expect(recommendationJobProcessor(blocked)).toBe("convex");

    const opened = resolve(
      {
        enabledRaw: "true",
        modeRaw: "serve",
        timeoutRaw: "1500",
        ...readyModel,
      },
      { ...readyService, serveGateEnabled: true },
      { ok: true }
    );
    expect(opened.mayRun).toBe(true);
    expect(opened.mayAffectCustomers).toBe(true);
    expect(opened.customerVisibleSource).toBe("python_ml");
    expect(recommendationJobProcessor(opened)).toBe("convex");
    expect(readPythonServiceSignals({ PYTHON_ML_SERVE_ENABLED: "TRUE" }).serveGateEnabled).toBe(
      true
    );
    expect(readPythonServiceSignals({}).serveGateEnabled).toBe(false);
  });

  it("falls back when the Python service is down or not ready", () => {
    const down = resolve(
      {
        enabledRaw: "true",
        modeRaw: "serve",
        timeoutRaw: "1500",
        ...readyModel,
      },
      { serviceConfigured: false, credentialsPresent: true, serveGateEnabled: true },
      { ok: false }
    );
    expect(down.mayRun).toBe(false);
    expect(down.customerVisibleSource).toBe("existing");

    const missingKey = resolve(
      {
        enabledRaw: "true",
        modeRaw: "shadow",
        timeoutRaw: "2000",
        ...readyModel,
      },
      { serviceConfigured: true, credentialsPresent: false, serveGateEnabled: true },
      { ok: true }
    );
    expect(missingKey.mayRun).toBe(false);
    expect(missingKey.customerVisibleSource).toBe("existing");

    const incompatible = resolve(
      {
        enabledRaw: "true",
        modeRaw: "shadow",
        timeoutRaw: "1500",
        modelAvailable: true,
        modelCompatible: false,
      },
      readyService,
      { ok: true }
    );
    expect(incompatible.mayRun).toBe(false);
    expect(incompatible.customerVisibleSource).toBe("existing");

    const callFailed = resolve(
      {
        enabledRaw: "true",
        modeRaw: "serve",
        timeoutRaw: "1500",
        ...readyModel,
      },
      { ...readyService, serveGateEnabled: true },
      { ok: false }
    );
    expect(callFailed.mayRun).toBe(true);
    expect(callFailed.mayAffectCustomers).toBe(false);
    expect(callFailed.customerVisibleSource).toBe("existing");
    expect(recommendationJobProcessor(callFailed)).toBe("convex");
  });

  it("registers the flags on the existing settings module without a public secret", () => {
    const settingsSource = readFileSync(path.join(convexDir, "settings.ts"), "utf8");
    expect(settingsSource).toContain("PYTHON_ML_SYSTEM_DEFAULTS");
    expect(settingsSource).toContain("assertPythonMlSettingValue");
    expect(settingsSource).toContain("assertCanModifyPythonMlSettings");
    expect(settingsSource).toContain("redactAdminSettings");
    const publicBlock = settingsSource.slice(
      settingsSource.indexOf("export const PUBLIC_SETTING_KEYS"),
      settingsSource.indexOf("export type SystemSettingKey")
    );
    expect(publicBlock).not.toContain("enable_python_ml_recommendations");
    expect(publicBlock).not.toContain("python_ml_recommendation_mode");
    expect(publicBlock).not.toContain("python_ml_recommendation_strategy");
    expect(publicBlock).not.toContain("PYTHON_AI_SERVICE");
    expect(publicBlock).not.toContain("api_key");

    const recommendations = readFileSync(path.join(convexDir, "recommendations.ts"), "utf8");
    const search = readFileSync(path.join(convexDir, "productSearch.ts"), "utf8");
    const schedule = readFileSync(
      path.join(convexDir, "lib/recommendations/scheduleRecommendationJob.ts"),
      "utf8"
    );
    expect(recommendations).not.toContain("getPythonMlJobConfig");
    expect(search).not.toContain("getPythonMlJobConfig");
    expect(schedule).not.toContain("getPythonMlJobConfig");

    const jobs = readFileSync(path.join(convexDir, "recommendationActions.ts"), "utf8");
    expect(jobs).toContain("getPythonMlJobConfig");
    expect(jobs).toContain("recommendationJobProcessor");
    expect(jobs).not.toContain("PYTHON_AI_SERVICE_API_KEY");
  });
});

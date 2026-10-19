import { isAdminRole } from "../authRoles";

export const ENABLE_AGENTIC_AI_KEY = "enable_agentic_ai";
export const ENABLE_AGENT_DRAFT_CREATION_KEY = "enable_agent_draft_creation";
export const AGENT_MAX_TOOL_CALLS_KEY = "agent_max_tool_calls";
export const AGENT_REQUIRE_DRAFT_APPROVAL_KEY = "agent_require_draft_approval";

export const AGENTIC_AI_ENV = "AGENTIC_AI_ENABLED";
export const AGENTIC_AI_DRAFT_WRITES_ENV = "AGENTIC_AI_DRAFT_WRITES_ENABLED";
/** Phase 8 keeps draft approval mandatory unless this explicit server policy is true. */
export const AGENTIC_AI_ALLOW_UNAPPROVED_DRAFTS_ENV = "AGENTIC_AI_ALLOW_UNAPPROVED_DRAFTS";

export const DEFAULT_MAX_TOOL_CALLS = 8;
export const MIN_TOOL_CALLS = 1;
export const MAX_TOOL_CALLS_CAP = 12;
/**
 * Each planner call sees prior tool observations. Eight calls let a sales
 * analysis reach a draft and a final report inside the tool-call budget.
 * A cap of five would stop that workflow before the draft step.
 */
export const DEFAULT_MAX_PLANNER_CALLS = 8;
export const DEFAULT_MAX_REPLANS = 2;
export const MAX_CONCURRENT_RUNS = 3;
export const MAX_OBSERVATION_BYTES = 10_240;
export const STEP_BUDGET_MS = 30_000;
export const TOOL_TIMEOUT_MS = 8_000;
export const LEASE_MS = 30_000;
export const RUN_RETENTION_MS = 24 * 60 * 60 * 1000;
export const AUDIT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const APPROVAL_TTL_MS = 4 * 60 * 60 * 1000;
export const MAX_QUESTION_LENGTH = 2_000;

export const AGENT_SYSTEM_DEFAULTS: {
  key:
    | typeof ENABLE_AGENTIC_AI_KEY
    | typeof ENABLE_AGENT_DRAFT_CREATION_KEY
    | typeof AGENT_MAX_TOOL_CALLS_KEY
    | typeof AGENT_REQUIRE_DRAFT_APPROVAL_KEY;
  name: string;
  value: string;
}[] = [
  { key: ENABLE_AGENTIC_AI_KEY, name: "Enable Agentic AI", value: "false" },
  {
    key: ENABLE_AGENT_DRAFT_CREATION_KEY,
    name: "Enable Agent Draft Creation",
    value: "false",
  },
  {
    key: AGENT_MAX_TOOL_CALLS_KEY,
    name: "Maximum Agent Tool Calls",
    value: String(DEFAULT_MAX_TOOL_CALLS),
  },
  {
    key: AGENT_REQUIRE_DRAFT_APPROVAL_KEY,
    name: "Require Approval for Draft Writes",
    value: "true",
  },
];

export function isAgentSettingKey(key: string): boolean {
  return AGENT_SYSTEM_DEFAULTS.some((item) => item.key === key);
}

export function assertCanModifyAgentSettings(role: string | null | undefined): void {
  if (!isAdminRole(role)) {
    throw new Error("Admin access required to update Agentic AI settings");
  }
}

export function parseAgentEnabled(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function deploymentGateEnabled(value: string | undefined): boolean {
  return value?.trim() === "true";
}

export function parseMaxToolCalls(value: string | null | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed) || parsed < MIN_TOOL_CALLS || parsed > MAX_TOOL_CALLS_CAP) {
    return DEFAULT_MAX_TOOL_CALLS;
  }
  return parsed;
}

/**
 * Draft writes stay approval-gated in Phase 8. The admin toggle cannot turn
 * approval off unless AGENTIC_AI_ALLOW_UNAPPROVED_DRAFTS is exactly "true".
 */
export function draftApprovalRequired(settingValue: string | null | undefined): boolean {
  if (process.env[AGENTIC_AI_ALLOW_UNAPPROVED_DRAFTS_ENV]?.trim() === "true") {
    return parseAgentEnabled(settingValue);
  }
  return true;
}

export function assertAgentSettingValue(key: string, value: string): void {
  const normalized = value.trim().toLowerCase();
  if (
    key === ENABLE_AGENTIC_AI_KEY ||
    key === ENABLE_AGENT_DRAFT_CREATION_KEY ||
    key === AGENT_REQUIRE_DRAFT_APPROVAL_KEY
  ) {
    if (normalized !== "true" && normalized !== "false") {
      throw new Error("Agentic AI boolean settings must be true or false");
    }
    return;
  }
  if (key === AGENT_MAX_TOOL_CALLS_KEY) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (!Number.isInteger(parsed) || parsed < MIN_TOOL_CALLS || parsed > MAX_TOOL_CALLS_CAP) {
      throw new Error(
        `Maximum agent tool calls must be between ${MIN_TOOL_CALLS} and ${MAX_TOOL_CALLS_CAP}`
      );
    }
  }
}

export function agentSettingFormError(key: string | undefined, value: string): string | undefined {
  if (!key || !isAgentSettingKey(key)) return undefined;
  try {
    assertAgentSettingValue(key, value);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid Agentic AI setting";
  }
}

export function agentRunGate(input: {
  adminEnabled: boolean;
  deploymentGate: boolean;
  providerConfigured: boolean;
}): { enabled: boolean; reason: string } {
  if (!input.adminEnabled) return { enabled: false, reason: "admin_disabled" };
  if (!input.deploymentGate) return { enabled: false, reason: "deployment_gate" };
  if (!input.providerConfigured) return { enabled: false, reason: "provider_unconfigured" };
  return { enabled: true, reason: "ready" };
}

export function draftWriteGate(input: {
  adminEnabled: boolean;
  deploymentGate: boolean;
}): { enabled: boolean; reason: string } {
  if (!input.adminEnabled) return { enabled: false, reason: "admin_disabled" };
  if (!input.deploymentGate) return { enabled: false, reason: "deployment_gate" };
  return { enabled: true, reason: "ready" };
}

const PROVIDER_ENV_KEYS: Record<string, string> = {
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  remote: "AI_WORKER_URL",
};

export function llmChainConfigured(
  env: Record<string, string | undefined> = process.env
): boolean {
  const raw = env.AI_PROVIDER_CHAIN ?? "gemini,groq,openrouter,openai";
  const names = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const chain = names.length > 0 ? names : ["gemini", "groq", "openrouter", "openai"];
  return chain.some((name) => {
    const key = PROVIDER_ENV_KEYS[name];
    return key ? Boolean(env[key]?.trim()) : false;
  });
}

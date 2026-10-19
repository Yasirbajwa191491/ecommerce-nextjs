import { isAdminRole } from "../authRoles";

/**
 * RAG shopping assistant flags live in the existing settings table.
 * The deployment gate and service credentials stay in environment variables.
 */

export const ENABLE_RAG_SHOPPING_ASSISTANT_KEY = "enable_rag_shopping_assistant";
export const RAG_RETRIEVAL_STRATEGY_KEY = "rag_retrieval_strategy";
export const RAG_MAX_RETRIEVED_DOCUMENTS_KEY = "rag_max_retrieved_documents";
export const RAG_GROUNDING_ENFORCEMENT_KEY = "rag_grounding_enforcement";

export const RAG_STRATEGIES = ["semantic", "keyword", "hybrid"] as const;
export type RagStrategy = (typeof RAG_STRATEGIES)[number];

export const RAG_GROUNDING_MODES = ["strict", "standard"] as const;
export type RagGroundingMode = (typeof RAG_GROUNDING_MODES)[number];

export const RAG_MAX_DOCUMENTS_MIN = 1;
export const RAG_MAX_DOCUMENTS_MAX = 10;
export const RAG_MAX_DOCUMENTS_DEFAULT = 5;

export const RAG_DEPLOYMENT_GATE_ENV = "RAG_SHOPPING_ASSISTANT_ENABLED";
export const RAG_INDEX_VERSION = "rag-v1";

export const RAG_SYSTEM_DEFAULTS: {
  key:
    | typeof ENABLE_RAG_SHOPPING_ASSISTANT_KEY
    | typeof RAG_RETRIEVAL_STRATEGY_KEY
    | typeof RAG_MAX_RETRIEVED_DOCUMENTS_KEY
    | typeof RAG_GROUNDING_ENFORCEMENT_KEY;
  name: string;
  value: string;
}[] = [
  {
    key: ENABLE_RAG_SHOPPING_ASSISTANT_KEY,
    name: "Enable RAG Shopping Assistant",
    value: "false",
  },
  {
    key: RAG_RETRIEVAL_STRATEGY_KEY,
    name: "RAG Retrieval Strategy",
    value: "hybrid",
  },
  {
    key: RAG_MAX_RETRIEVED_DOCUMENTS_KEY,
    name: "RAG Maximum Retrieved Documents",
    value: String(RAG_MAX_DOCUMENTS_DEFAULT),
  },
  {
    key: RAG_GROUNDING_ENFORCEMENT_KEY,
    name: "RAG Grounding Enforcement",
    value: "strict",
  },
];

export function isRagSettingKey(key: string): boolean {
  return (
    key === ENABLE_RAG_SHOPPING_ASSISTANT_KEY ||
    key === RAG_RETRIEVAL_STRATEGY_KEY ||
    key === RAG_MAX_RETRIEVED_DOCUMENTS_KEY ||
    key === RAG_GROUNDING_ENFORCEMENT_KEY
  );
}

export function assertCanModifyRagSettings(role: string | null | undefined): void {
  if (!isAdminRole(role)) {
    throw new Error("Admin access required to update RAG settings");
  }
}

export function parseRagEnabled(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function parseRagStrategy(value: string | null | undefined): RagStrategy {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "semantic" || normalized === "keyword" || normalized === "hybrid") {
    return normalized;
  }
  return "hybrid";
}

export function parseRagMaxDocuments(value: string | null | undefined): number {
  const raw = value?.trim() ?? "";
  if (!/^\d+$/.test(raw)) return RAG_MAX_DOCUMENTS_DEFAULT;
  const parsed = Number.parseInt(raw, 10);
  if (parsed < RAG_MAX_DOCUMENTS_MIN || parsed > RAG_MAX_DOCUMENTS_MAX) {
    return RAG_MAX_DOCUMENTS_DEFAULT;
  }
  return parsed;
}

export function parseRagGrounding(value: string | null | undefined): RagGroundingMode {
  return value?.trim().toLowerCase() === "standard" ? "standard" : "strict";
}

export function assertRagSettingValue(key: string, value: string): void {
  if (key === ENABLE_RAG_SHOPPING_ASSISTANT_KEY) {
    const normalized = value.trim().toLowerCase();
    if (normalized !== "true" && normalized !== "false") {
      throw new Error("Enable RAG Shopping Assistant must be true or false");
    }
  }
  if (key === RAG_RETRIEVAL_STRATEGY_KEY) {
    const normalized = value.trim().toLowerCase();
    if (normalized !== "semantic" && normalized !== "keyword" && normalized !== "hybrid") {
      throw new Error("RAG retrieval strategy must be semantic, keyword, or hybrid");
    }
  }
  if (key === RAG_MAX_RETRIEVED_DOCUMENTS_KEY) {
    if (!/^\d+$/.test(value.trim())) {
      throw new Error("RAG maximum retrieved documents must be an integer from 1 to 10");
    }
    const parsed = Number.parseInt(value.trim(), 10);
    if (parsed < RAG_MAX_DOCUMENTS_MIN || parsed > RAG_MAX_DOCUMENTS_MAX) {
      throw new Error("RAG maximum retrieved documents must be an integer from 1 to 10");
    }
  }
  if (key === RAG_GROUNDING_ENFORCEMENT_KEY) {
    const normalized = value.trim().toLowerCase();
    if (normalized !== "strict" && normalized !== "standard") {
      throw new Error("RAG grounding enforcement must be strict or standard");
    }
  }
}

export function ragSettingFormError(key: string | undefined, value: string): string | undefined {
  if (!key || !isRagSettingKey(key)) return undefined;
  try {
    assertRagSettingValue(key, value.trim());
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid RAG setting";
  }
}

export type RagAvailabilityInput = {
  adminEnabled: boolean;
  deploymentGate: boolean;
  indexReady: boolean;
  serviceConfigured: boolean;
  providerConfigured: boolean;
};

/**
 * strict: any failed citation, price, stock, or safety check replaces the answer
 * with a fallback and drops citations.
 * standard: invalid or missing citations are dropped or filled from retrieved
 * chunks. Unsafe text and contradicted price or stock claims still use the fallback.
 */
export function resolveRagAvailability(input: RagAvailabilityInput): {
  enabled: boolean;
  reason: string;
} {
  if (!input.adminEnabled) return { enabled: false, reason: "admin_disabled" };
  if (!input.deploymentGate) return { enabled: false, reason: "deployment_gate" };
  if (!input.serviceConfigured) return { enabled: false, reason: "service_unconfigured" };
  if (!input.indexReady) return { enabled: false, reason: "index_unavailable" };
  if (!input.providerConfigured) return { enabled: false, reason: "provider_unconfigured" };
  return { enabled: true, reason: "ready" };
}

export function deploymentGateEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

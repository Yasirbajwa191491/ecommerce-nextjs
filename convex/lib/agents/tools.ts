import { MAX_OBSERVATION_BYTES, TOOL_TIMEOUT_MS } from "./config";
import { byteLength, sanitizeUnknown, stableHash } from "./security";
import type { FactType, ToolExecContext, ToolHandler, ToolRisk } from "./types";

export type ArgKind = "string" | "number" | "boolean" | "string_array";

export type ArgSpec = {
  key: string;
  kind: ArgKind;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enumValues?: readonly string[];
  maxItems?: number;
};

export type ToolDefinition = {
  name: string;
  description: string;
  risk: Exclude<ToolRisk, "high_risk">;
  permission: "admin";
  timeoutMs: number;
  maxResultBytes: number;
  idempotent: boolean;
  arguments: ArgSpec[];
  additionalProperties: boolean;
};

export const FORBIDDEN_TOOL_NAMES = [
  "send_marketing_email",
  "send_email",
  "change_price",
  "update_price",
  "update_inventory",
  "adjust_stock",
  "refund_payment",
  "cancel_order",
  "delete_product",
  "activate_discount",
  "publish_campaign",
  "run_shell",
  "fetch_url",
  "eval",
] as const;

const readOnly = (name: string, description: string, args: ArgSpec[]): ToolDefinition => ({
  name,
  description,
  risk: "read_only",
  permission: "admin",
  timeoutMs: TOOL_TIMEOUT_MS,
  maxResultBytes: MAX_OBSERVATION_BYTES,
  idempotent: true,
  arguments: args,
  additionalProperties: false,
});

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  readOnly("get_sales_analytics", "Read stored sales revenue, units, orders, products, and categories.", [
    { key: "range", kind: "string", required: true, enumValues: ["7d", "30d", "90d"] },
    { key: "category", kind: "string", maxLength: 80 },
  ]),
  readOnly("get_product_performance", "Read stored product sales, category, brand, stock, and recent demand trend.", [
    { key: "query", kind: "string", maxLength: 120 },
    { key: "productId", kind: "string", maxLength: 80 },
    { key: "range", kind: "string", enumValues: ["7d", "30d", "90d"] },
  ]),
  readOnly("get_inventory_insights", "Read current stock, low stock, slow movers, and stockout risk. Does not change stock.", [
    { key: "query", kind: "string", maxLength: 120 },
    { key: "limit", kind: "number", min: 1, max: 20 },
  ]),
  readOnly("get_demand_forecast", "Read a published demand forecast. Returns unavailable when no publication exists.", [
    { key: "query", kind: "string", maxLength: 120 },
  ]),
  readOnly("search_products", "Search the product catalog by name.", [
    { key: "query", kind: "string", required: true, minLength: 1, maxLength: 120 },
    { key: "limit", kind: "number", min: 1, max: 10 },
  ]),
  readOnly("get_marketing_campaigns", "Read campaign drafts and templates without subscriber email addresses.", [
    { key: "status", kind: "string", enumValues: ["draft", "sent", "all"] },
    { key: "limit", kind: "number", min: 1, max: 20 },
  ]),
  readOnly("retrieve_store_knowledge", "Retrieve store policy and product excerpts through the existing RAG index.", [
    { key: "question", kind: "string", required: true, minLength: 3, maxLength: 400 },
  ]),
  {
    name: "create_marketing_campaign_draft",
    description: "Save an editable email campaign draft. Never sends email or changes prices.",
    risk: "draft_writing",
    permission: "admin",
    timeoutMs: TOOL_TIMEOUT_MS,
    maxResultBytes: MAX_OBSERVATION_BYTES,
    idempotent: true,
    additionalProperties: false,
    arguments: [
      { key: "title", kind: "string", required: true, minLength: 3, maxLength: 120 },
      { key: "subject", kind: "string", required: true, minLength: 3, maxLength: 160 },
      { key: "body", kind: "string", required: true, minLength: 10, maxLength: 4_000 },
      { key: "productIds", kind: "string_array", required: true, maxItems: 8 },
      { key: "promotionExplanation", kind: "string", required: true, minLength: 3, maxLength: 500 },
      { key: "rationale", kind: "string", required: true, minLength: 3, maxLength: 1_000 },
    ],
  },
];

const TOOL_MAP = new Map(TOOL_DEFINITIONS.map((tool) => [tool.name, tool]));

export function listTools(): ToolDefinition[] {
  return TOOL_DEFINITIONS;
}

export function getTool(name: string): ToolDefinition | undefined {
  return TOOL_MAP.get(name);
}

export function isForbiddenTool(name: string): boolean {
  return (FORBIDDEN_TOOL_NAMES as readonly string[]).includes(name);
}

export function validateToolArguments(
  tool: ToolDefinition,
  args: unknown
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return { ok: false, error: "Tool arguments must be an object" };
  }
  const source = args as Record<string, unknown>;
  if (!tool.additionalProperties) {
    const allowed = new Set(tool.arguments.map((spec) => spec.key));
    for (const key of Object.keys(source)) {
      if (!allowed.has(key)) return { ok: false, error: `Unexpected argument: ${key}` };
    }
  }
  const value: Record<string, unknown> = {};
  for (const spec of tool.arguments) {
    const raw = source[spec.key];
    if (raw === undefined || raw === null || raw === "") {
      if (spec.required) return { ok: false, error: `Missing argument: ${spec.key}` };
      continue;
    }
    const parsed = parseArg(spec, raw);
    if (!parsed.ok) return parsed;
    value[spec.key] = parsed.value;
  }
  return { ok: true, value };
}

function parseArg(
  spec: ArgSpec,
  raw: unknown
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (spec.kind === "string") {
    if (typeof raw !== "string") return { ok: false, error: `${spec.key} must be a string` };
    const text = raw.trim();
    if (spec.minLength !== undefined && text.length < spec.minLength) {
      return { ok: false, error: `${spec.key} is too short` };
    }
    if (spec.maxLength !== undefined && text.length > spec.maxLength) {
      return { ok: false, error: `${spec.key} is too long` };
    }
    if (spec.enumValues && !spec.enumValues.includes(text)) {
      return { ok: false, error: `${spec.key} is not an allowed value` };
    }
    return { ok: true, value: text };
  }
  if (spec.kind === "number") {
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      return { ok: false, error: `${spec.key} must be a number` };
    }
    if (spec.min !== undefined && raw < spec.min) return { ok: false, error: `${spec.key} is too small` };
    if (spec.max !== undefined && raw > spec.max) return { ok: false, error: `${spec.key} is too large` };
    return { ok: true, value: raw };
  }
  if (spec.kind === "boolean") {
    if (typeof raw !== "boolean") return { ok: false, error: `${spec.key} must be a boolean` };
    return { ok: true, value: raw };
  }
  if (!Array.isArray(raw) || raw.some((item) => typeof item !== "string")) {
    return { ok: false, error: `${spec.key} must be an array of strings` };
  }
  const items = raw.map((item) => item.trim()).filter(Boolean);
  if (spec.required && items.length === 0) return { ok: false, error: `${spec.key} is required` };
  if (spec.maxItems !== undefined && items.length > spec.maxItems) {
    return { ok: false, error: `${spec.key} has too many items` };
  }
  return { ok: true, value: items };
}

export function summarizeToolResult(
  name: string,
  result: unknown
): { summary: string; factType: FactType; skipped: boolean } {
  if (!result || typeof result !== "object") {
    return { summary: `${name} returned no structured data`, factType: "unavailable", skipped: true };
  }
  const record = result as Record<string, unknown>;
  if (record.available === false) {
    const reason = typeof record.reason === "string" ? record.reason : "unavailable";
    return { summary: `${name} was unavailable (${reason})`, factType: "unavailable", skipped: true };
  }
  if (name === "get_demand_forecast") {
    return {
      summary: `Published forecast ${String(record.modelVersion ?? "")} horizon ${String(record.horizonDays ?? "")} days`.trim(),
      factType: "estimate",
      skipped: false,
    };
  }
  if (name === "create_marketing_campaign_draft") {
    return {
      summary: `Draft saved: ${String(record.title ?? "campaign")}`,
      factType: "verified",
      skipped: false,
    };
  }
  if (typeof record.summary === "string" && record.summary.trim()) {
    return { summary: record.summary, factType: "verified", skipped: false };
  }
  return { summary: `${name} completed from stored records`, factType: "verified", skipped: false };
}

const TRANSIENT = /timeout|temporarily|503|429|econnreset/i;

export async function executeRegisteredTool(input: {
  name: string;
  args: unknown;
  role: "admin" | "customer";
  context: ToolExecContext;
  handlers: Partial<Record<string, ToolHandler>>;
  timeoutMs?: number;
  backoffMs?: number;
}): Promise<
  | {
      ok: true;
      result: unknown;
      summary: string;
      factType: FactType;
      skipped: boolean;
      risk: ToolRisk;
      durationMs: number;
      arguments: Record<string, unknown>;
      argumentsHash: string;
    }
  | {
      ok: false;
      errorCategory: string;
      summary: string;
      risk?: ToolRisk;
      durationMs: number;
      arguments?: Record<string, unknown>;
    }
> {
  const started = Date.now();
  if (isForbiddenTool(input.name)) {
    return {
      ok: false,
      errorCategory: "forbidden_tool",
      summary: "That action is not available to the agent",
      durationMs: Date.now() - started,
    };
  }
  const tool = getTool(input.name);
  if (!tool) {
    return {
      ok: false,
      errorCategory: "unknown_tool",
      summary: "The requested tool is not registered",
      durationMs: Date.now() - started,
    };
  }
  if (input.role !== tool.permission) {
    return {
      ok: false,
      errorCategory: "unauthorized",
      summary: "Admin permission is required",
      risk: tool.risk,
      durationMs: Date.now() - started,
    };
  }
  const parsed = validateToolArguments(tool, input.args);
  if (!parsed.ok) {
    return {
      ok: false,
      errorCategory: "invalid_arguments",
      summary: parsed.error,
      risk: tool.risk,
      durationMs: Date.now() - started,
    };
  }
  const handler = input.handlers[tool.name];
  if (!handler) {
    return {
      ok: false,
      errorCategory: "tool_unavailable",
      summary: `${tool.name} is not available in this run`,
      risk: tool.risk,
      durationMs: Date.now() - started,
      arguments: parsed.value,
    };
  }
  const timeoutMs = input.timeoutMs ?? tool.timeoutMs;
  let attempt = 0;
  let lastError = "Tool failed";
  while (attempt < (tool.idempotent ? 2 : 1)) {
    attempt += 1;
    try {
      const raw = await withTimeout(handler(parsed.value, input.context), timeoutMs);
      const result = sanitizeUnknown(raw, tool.maxResultBytes);
      if (byteLength(result) > tool.maxResultBytes) {
        return {
          ok: false,
          errorCategory: "result_too_large",
          summary: "Tool result exceeded the size limit",
          risk: tool.risk,
          durationMs: Date.now() - started,
          arguments: parsed.value,
        };
      }
      const summary = summarizeToolResult(tool.name, result);
      return {
        ok: true,
        result,
        summary: summary.summary,
        factType: summary.factType,
        skipped: summary.skipped,
        risk: tool.risk,
        durationMs: Date.now() - started,
        arguments: parsed.value,
        argumentsHash: stableHash(parsed.value),
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Tool failed";
      const transient = TRANSIENT.test(lastError);
      if (!tool.idempotent || !transient || attempt >= 2) break;
      await delay(input.backoffMs ?? 20);
    }
  }
  const category = /timeout/i.test(lastError) ? "timeout" : "tool_failure";
  return {
    ok: false,
    errorCategory: category,
    summary: category === "timeout" ? "Tool timed out" : "Tool failed",
    risk: tool.risk,
    durationMs: Date.now() - started,
    arguments: parsed.value,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("tool_timeout")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

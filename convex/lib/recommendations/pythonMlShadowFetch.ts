/**
 * Calls the Python behavioral endpoint during a shadow run.
 * The service key is read here so recommendation job files do not embed it.
 */

import { type PythonMlStrategy } from "./pythonMlConfig";

const MAX_ANCHORS = 5;

export type ShadowProbeResult = {
  ok: boolean;
  latencyMs: number;
  idsByProduct: Record<string, string[]>;
  errorCode?: string;
  fallbackCount: number;
};

export async function probePythonStrategy(args: {
  productIds: string[];
  strategy: PythonMlStrategy;
  timeoutMs: number;
  env?: Record<string, string | undefined>;
}): Promise<ShadowProbeResult> {
  const env = args.env ?? process.env;
  const baseUrl = env.PYTHON_AI_SERVICE_URL?.trim() ?? "";
  const apiKey = env.PYTHON_AI_SERVICE_API_KEY?.trim() ?? "";
  const started = Date.now();
  if (!baseUrl || !apiKey) {
    return {
      ok: false,
      latencyMs: 0,
      idsByProduct: {},
      errorCode: "service_not_configured",
      fallbackCount: 0,
    };
  }
  const idsByProduct: Record<string, string[]> = {};
  let fallbackCount = 0;
  let failures = 0;
  for (const productId of args.productIds.slice(0, MAX_ANCHORS)) {
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/recommendations/behavioral`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          product_id: productId,
          top_k: 8,
          strategy: args.strategy,
        }),
        signal: AbortSignal.timeout(args.timeoutMs),
      });
      if (!response.ok) {
        failures += 1;
        idsByProduct[productId] = [];
        continue;
      }
      const payload: unknown = await response.json();
      const parsed = parseProbePayload(payload);
      if (!parsed) {
        failures += 1;
        idsByProduct[productId] = [];
        continue;
      }
      if (parsed.strategy !== args.strategy) fallbackCount += 1;
      idsByProduct[productId] = parsed.productIds;
    } catch {
      failures += 1;
      idsByProduct[productId] = [];
    }
  }
  return {
    ok: failures < args.productIds.length,
    latencyMs: Date.now() - started,
    idsByProduct,
    errorCode: failures === args.productIds.length ? "python_unavailable" : undefined,
    fallbackCount,
  };
}

export function parseProbePayload(
  payload: unknown
): { strategy: PythonMlStrategy; productIds: string[] } | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { strategy?: unknown; recommendations?: unknown };
  if (typeof record.strategy !== "string") return null;
  if (record.strategy !== "content" && record.strategy !== "collaborative" && record.strategy !== "hybrid") {
    return null;
  }
  const strategy = record.strategy;
  if (!Array.isArray(record.recommendations)) return null;
  const productIds: string[] = [];
  for (const item of record.recommendations) {
    if (!item || typeof item !== "object") return null;
    const productId = (item as { product_id?: unknown }).product_id;
    if (typeof productId !== "string" || !productId) return null;
    productIds.push(productId);
  }
  return { strategy, productIds };
}

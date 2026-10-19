/**
 * Authenticated calls to the Python RAG routes.
 * API keys stay in Convex environment variables.
 */

import { requiresHttpsSiteUrl, type SiteUrlEnv } from "../siteUrl";

const REQUEST_TIMEOUT_MS = 8_000;

export type RagPythonEnv = {
  PYTHON_AI_SERVICE_URL?: string;
  PYTHON_AI_SERVICE_API_KEY?: string;
} & SiteUrlEnv;

export function ragServiceConfigured(env: RagPythonEnv): boolean {
  return Boolean(env.PYTHON_AI_SERVICE_URL?.trim() && env.PYTHON_AI_SERVICE_API_KEY?.trim());
}

function assertSafeServiceUrl(raw: string, env: RagPythonEnv): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("PYTHON_AI_SERVICE_URL is not a valid URL");
  }
  if (parsed.username || parsed.password) {
    throw new Error("PYTHON_AI_SERVICE_URL must not embed credentials");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("PYTHON_AI_SERVICE_URL must use HTTP or HTTPS");
  }
  if (requiresHttpsSiteUrl(env)) {
    if (parsed.protocol !== "https:") {
      throw new Error("PYTHON_AI_SERVICE_URL must use HTTPS in production");
    }
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      throw new Error("PYTHON_AI_SERVICE_URL must not use localhost in production");
    }
  }
  return raw.replace(/\/$/, "");
}

function endpoint(base: string, path: string): string {
  const root = new URL(base.endsWith("/") ? base : `${base}/`);
  const target = new URL(path, root);
  if (target.origin !== root.origin) {
    throw new Error("PYTHON_AI_SERVICE_URL path is not allowed");
  }
  return target.toString();
}

export async function postRag<T>(
  path: string,
  body: unknown,
  env: RagPythonEnv,
  fetchImpl: typeof fetch = fetch
): Promise<T> {
  return requestService<T>("POST", path, env, fetchImpl, body);
}

export async function getService<T>(
  path: string,
  env: RagPythonEnv,
  fetchImpl: typeof fetch = fetch
): Promise<T> {
  return requestService<T>("GET", path, env, fetchImpl);
}

async function requestService<T>(
  method: "GET" | "POST",
  path: string,
  env: RagPythonEnv,
  fetchImpl: typeof fetch,
  body?: unknown
): Promise<T> {
  const base = assertSafeServiceUrl(env.PYTHON_AI_SERVICE_URL?.trim() ?? "", env);
  const apiKey = env.PYTHON_AI_SERVICE_API_KEY?.trim() ?? "";
  if (!apiKey) throw new Error("PYTHON_AI_SERVICE_API_KEY is not configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(endpoint(base, path), {
      method,
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status >= 300 && response.status < 400) {
      throw new Error("Python service redirected the request");
    }
    if (!response.ok) {
      throw new Error(`Python service returned ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function defaultRagEnv(): RagPythonEnv {
  return {
    PYTHON_AI_SERVICE_URL: process.env.PYTHON_AI_SERVICE_URL,
    PYTHON_AI_SERVICE_API_KEY: process.env.PYTHON_AI_SERVICE_API_KEY,
    CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
    REQUIRE_HTTPS_SITE_URL: process.env.REQUIRE_HTTPS_SITE_URL,
    SITE_URL: process.env.SITE_URL,
  };
}

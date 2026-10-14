/**
 * Isolated adapter for a future Convex action to call the Python AI service.
 *
 * Nothing in the storefront, checkout, search, recommendations, or existing AI
 * provider chain imports this module. It reads PYTHON_AI_SERVICE_URL and
 * PYTHON_AI_SERVICE_API_KEY, which are separate from AI_PROVIDER, AI_PROVIDER_CHAIN,
 * and AI_WORKER_URL.
 */

import { requiresHttpsSiteUrl, type SiteUrlEnv } from "../siteUrl";

const LIVE_PATH = "/health/live";
const STATUS_PATH = "/api/v1/internal/status";
const REQUEST_TIMEOUT_MS = 5_000;

export type PythonAiServiceEnv = {
  PYTHON_AI_SERVICE_URL?: string;
  PYTHON_AI_SERVICE_API_KEY?: string;
} & SiteUrlEnv;

export type PythonAiServiceProbe = {
  configured: boolean;
  checked: boolean;
  live: boolean | null;
  authenticated: boolean | null;
};

const UNCONFIGURED: PythonAiServiceProbe = {
  configured: false,
  checked: false,
  live: null,
  authenticated: null,
};

function defaultEnv(): PythonAiServiceEnv {
  return {
    PYTHON_AI_SERVICE_URL: process.env.PYTHON_AI_SERVICE_URL,
    PYTHON_AI_SERVICE_API_KEY: process.env.PYTHON_AI_SERVICE_API_KEY,
    CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
    REQUIRE_HTTPS_SITE_URL: process.env.REQUIRE_HTTPS_SITE_URL,
    SITE_URL: process.env.SITE_URL,
  };
}

function assertSafeServiceUrl(raw: string, env: PythonAiServiceEnv): string {
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

function isRedirect(response: Response): boolean {
  return (
    response.type === "opaqueredirect" ||
    (response.status >= 300 && response.status < 400)
  );
}

async function request(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetchImpl(url, {
      ...init,
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readLive(fetchImpl: typeof fetch, url: string): Promise<boolean> {
  try {
    const response = await request(fetchImpl, url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (isRedirect(response) || !response.ok) return false;
    const body: unknown = await response.json();
    return isRecord(body) && body.status === "live";
  } catch {
    return false;
  }
}

async function readAuthenticated(
  fetchImpl: typeof fetch,
  url: string,
  apiKey: string
): Promise<boolean | null> {
  try {
    const response = await request(fetchImpl, url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (isRedirect(response)) return null;
    if (response.status === 401 || response.status === 403 || response.status === 503) {
      return false;
    }
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return isRecord(body) && body.status === "ok" ? true : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function probePythonAiService(
  env: PythonAiServiceEnv = defaultEnv(),
  fetchImpl: typeof fetch = fetch
): Promise<PythonAiServiceProbe> {
  const baseUrl = env.PYTHON_AI_SERVICE_URL?.trim() ?? "";
  if (!baseUrl) {
    return { ...UNCONFIGURED };
  }

  const base = assertSafeServiceUrl(baseUrl, env);
  const apiKey = env.PYTHON_AI_SERVICE_API_KEY?.trim() ?? "";
  const live = await readLive(fetchImpl, endpoint(base, LIVE_PATH));
  if (!apiKey) {
    return { configured: true, checked: true, live, authenticated: null };
  }
  const authenticated = await readAuthenticated(
    fetchImpl,
    endpoint(base, STATUS_PATH),
    apiKey
  );
  return { configured: true, checked: true, live, authenticated };
}

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import { probePythonAiService } from "./pythonAiServiceClient";

const dir = path.dirname(fileURLToPath(import.meta.url));
const convexRoot = path.resolve(dir, "../..");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("probePythonAiService", () => {
  it("does nothing when the service URL is unset", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const result = await probePythonAiService({}, fetchImpl);
    expect(result).toEqual({
      configured: false,
      checked: false,
      live: null,
      authenticated: null,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("ignores the existing review-worker provider settings", async () => {
    vi.stubEnv("AI_WORKER_URL", "http://127.0.0.1:3100");
    vi.stubEnv("AI_PROVIDER", "remote");
    vi.stubEnv("AI_PROVIDER_CHAIN", "gemini,groq,openrouter,openai");
    vi.stubEnv("PYTHON_AI_SERVICE_URL", "");
    const fetchImpl = vi.fn<typeof fetch>();
    const result = await probePythonAiService(undefined, fetchImpl);
    expect(result.configured).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("checks liveness without sending the service key", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ status: "live" }));
    const result = await probePythonAiService(
      { PYTHON_AI_SERVICE_URL: "http://127.0.0.1:8000" },
      fetchImpl
    );
    expect(result).toEqual({
      configured: true,
      checked: true,
      live: true,
      authenticated: null,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const init = fetchImpl.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get("authorization")).toBeNull();
  });

  it("reports an authenticated status only when the internal route confirms it", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/health/live")) return jsonResponse({ status: "live" });
      return jsonResponse({ status: "ok", inference_enabled: false });
    });
    const result = await probePythonAiService(
      {
        PYTHON_AI_SERVICE_URL: "https://ai.example.com/",
        PYTHON_AI_SERVICE_API_KEY: "service-key-value",
      },
      fetchImpl
    );
    expect(result.live).toBe(true);
    expect(result.authenticated).toBe(true);
    const statusCall = fetchImpl.mock.calls[1];
    expect(String(statusCall?.[0])).toBe("https://ai.example.com/api/v1/internal/status");
    expect(new Headers(statusCall?.[1]?.headers).get("authorization")).toBe(
      "Bearer service-key-value"
    );
    expect(JSON.stringify(result)).not.toContain("service-key-value");
  });

  it("records an authentication rejection without echoing the supplied key", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      if (String(input).endsWith("/health/live")) return jsonResponse({ status: "live" });
      return new Response(JSON.stringify({ detail: "Unauthorized" }), { status: 401 });
    });
    const result = await probePythonAiService(
      {
        PYTHON_AI_SERVICE_URL: "https://ai.example.com",
        PYTHON_AI_SERVICE_API_KEY: "expected-key",
      },
      fetchImpl
    );
    expect(result.live).toBe(true);
    expect(result.authenticated).toBe(false);
  });

  it("does not follow redirects or claim the redirect target is healthy", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () =>
        new Response(null, {
          status: 302,
          headers: { Location: "https://evil.example/collect" },
        })
    );
    const result = await probePythonAiService(
      {
        PYTHON_AI_SERVICE_URL: "https://ai.example.com",
        PYTHON_AI_SERVICE_API_KEY: "service-key-value",
      },
      fetchImpl
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0]?.[1]?.redirect).toBe("manual");
    expect(result.live).toBe(false);
    expect(result.authenticated).toBeNull();
  });

  it("treats network failures as unchecked health", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new Error("connection refused");
    });
    const result = await probePythonAiService(
      {
        PYTHON_AI_SERVICE_URL: "https://ai.example.com",
        PYTHON_AI_SERVICE_API_KEY: "service-key-value",
      },
      fetchImpl
    );
    expect(result.checked).toBe(true);
    expect(result.live).toBe(false);
    expect(result.authenticated).toBeNull();
  });

  it("rejects insecure production URLs without including the secret", async () => {
    const secret = "embedded-secret";
    const fetchImpl = vi.fn<typeof fetch>();
    await expect(
      probePythonAiService(
        {
          PYTHON_AI_SERVICE_URL: `http://${secret}@ai.example.com`,
          PYTHON_AI_SERVICE_API_KEY: secret,
          CONVEX_DEPLOYMENT: "prod:example",
        },
        fetchImpl
      )
    ).rejects.toThrow(/must not embed credentials/);
    await expect(
      probePythonAiService(
        {
          PYTHON_AI_SERVICE_URL: `http://${secret}@ai.example.com`,
          PYTHON_AI_SERVICE_API_KEY: secret,
          CONVEX_DEPLOYMENT: "prod:example",
        },
        fetchImpl
      ).catch((error: unknown) => {
        expect(String(error)).not.toContain(secret);
        throw error;
      })
    ).rejects.toThrow(/must not embed credentials/);
    expect(fetchImpl).not.toHaveBeenCalled();

    await expect(
      probePythonAiService(
        {
          PYTHON_AI_SERVICE_URL: "http://ai.example.com",
          CONVEX_DEPLOYMENT: "prod:example",
        },
        fetchImpl
      )
    ).rejects.toThrow(/HTTPS/);

    await expect(
      probePythonAiService(
        {
          PYTHON_AI_SERVICE_URL: "https://127.0.0.1:8000",
          CONVEX_DEPLOYMENT: "prod:example",
        },
        fetchImpl
      )
    ).rejects.toThrow(/localhost/);
  });
});

describe("provider isolation", () => {
  it("leaves the existing provider chain untouched", () => {
    const provider = readFileSync(path.join(dir, "getProvider.ts"), "utf8");
    const chain = readFileSync(path.join(dir, "providerChain.ts"), "utf8");
    expect(provider).toContain("AI_WORKER_URL");
    expect(provider).toContain("AI_PROVIDER");
    expect(provider).not.toContain("PYTHON_AI_SERVICE");
    expect(chain).toContain("AI_PROVIDER_CHAIN");
    expect(chain).not.toContain("PYTHON_AI_SERVICE");
  });

  it("is not imported by other Convex modules", () => {
    const files = walk(convexRoot).filter(
      (file) =>
        file.endsWith(".ts") &&
        !file.endsWith("pythonAiServiceClient.ts") &&
        !file.endsWith("pythonAiServiceClient.test.ts")
    );
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toContain("pythonAiServiceClient");
      expect(text, file).not.toContain("probePythonAiService");
    }
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function walk(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];
  for (const entry of entries) {
    if (entry === "_generated" || entry === "node_modules") continue;
    const fullPath = path.join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

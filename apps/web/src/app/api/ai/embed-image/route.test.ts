import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const embed = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai/image-embedding/service", () => ({ embedImage: embed }));
vi.mock("@/lib/ai/image-embedding/health", () => ({ getProviderHealthSnapshot: () => ({}) }));
import { POST } from "./route";
afterEach(() => { vi.unstubAllEnvs(); embed.mockReset(); });
it("fails closed when the shared secret is absent or weak", async () => {
  for (const secret of ["", "development"]) {
    vi.stubEnv("IMAGE_EMBED_API_SECRET", secret);
    expect((await POST(new NextRequest("https://shop.example", { method: "POST", body: "{}" }))).status).toBe(401);
  }
  expect(embed).not.toHaveBeenCalled();
});
it("rejects a mismatched secret before parsing or invoking inference", async () => {
  vi.stubEnv("IMAGE_EMBED_API_SECRET", "a".repeat(32));
  expect((await POST(new NextRequest("https://shop.example", { method: "POST", headers: { "x-image-embed-secret": "b".repeat(32) }, body: "invalid" }))).status).toBe(401);
  expect(embed).not.toHaveBeenCalled();
});
it("accepts the configured secret and does not expose provider exceptions", async () => {
  vi.stubEnv("IMAGE_EMBED_API_SECRET", "a".repeat(32)); embed.mockRejectedValue(new Error("synthetic-private-detail"));
  const response = await POST(new NextRequest("https://shop.example", { method: "POST", headers: { "x-image-embed-secret": "a".repeat(32) }, body: "{}" }));
  expect(response.status).toBe(500); expect(await response.text()).not.toContain("synthetic-private-detail");
});

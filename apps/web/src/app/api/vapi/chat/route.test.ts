import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ mutation: vi.fn(), fetch: vi.fn() }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { mutation = mocks.mutation; } }));
vi.mock("@convex/_generated/api", () => ({ api: { guestIdentity: { issue: "issue" }, aiUsage: { reserve: "reserve" } } }));
import { POST } from "./route";
const request = (body: unknown, cookie?: string) => new Request("https://shop.example/api/vapi/chat", { method: "POST", headers: cookie ? { cookie } : {}, body: JSON.stringify(body) });
beforeEach(() => {
  vi.stubEnv("VAPI_API_KEY", "synthetic-key"); vi.stubEnv("NEXT_PUBLIC_VAPI_ASSISTANT_ID", "synthetic-assistant"); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
  mocks.mutation.mockReset().mockImplementation(async (fn) => fn === "issue" ? "a".repeat(64) : undefined);
  mocks.fetch.mockReset().mockImplementation(async () => Response.json({ id: "chat-1", output: [{ content: "Hello" }] })); vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("reserves budget before calling the provider and signs the continuation", async () => {
  const first = await POST(request({ message: "hello" })); expect(first.status).toBe(200);
  expect(mocks.mutation.mock.calls.map(c => c[0])).toEqual(["issue", "reserve"]);
  const cookie = first.headers.get("set-cookie")!.split(";")[0];
  expect(cookie).toContain("vapi-session="); expect(first.headers.get("set-cookie")).toContain("HttpOnly");
  const next = await POST(request({ message: "next", previousChatId: "chat-1" }, cookie)); expect(next.status).toBe(200);
  expect(JSON.parse(mocks.fetch.mock.calls[1][1].body).previousChatId).toBe("chat-1");
});
it("denies forged conversation ownership before a paid request", async () => {
  expect((await POST(request({ message: "hello", previousChatId: "someone-elses-chat" }))).status).toBe(403);
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("does not contact the provider when the global quota rejects", async () => {
  mocks.mutation.mockImplementation(async (fn) => { if (fn === "reserve") throw new Error("quota"); return "a".repeat(64); });
  expect((await POST(request({ message: "hello" }))).status).toBe(429); expect(mocks.fetch).not.toHaveBeenCalled();
});
it("bounds streamed bodies even without Content-Length", async () => {
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("x".repeat(5000))); controller.close(); } });
  const req = new Request("https://shop.example", { method: "POST", body: stream, duplex: "half" } as RequestInit);
  expect((await POST(req)).status).toBe(429); expect(mocks.fetch).not.toHaveBeenCalled();
});
it("bounds concurrent provider work and releases slots after completion", async () => {
  let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; });
  mocks.fetch.mockImplementation(async () => { await pending; return Response.json({ id: "chat-1" }); });
  const first = POST(request({ message: "one" })); const second = POST(request({ message: "two" }));
  expect((await POST(request({ message: "three" }))).status).toBe(429);
  release(); expect((await first).status).toBe(200); expect((await second).status).toBe(200);
});

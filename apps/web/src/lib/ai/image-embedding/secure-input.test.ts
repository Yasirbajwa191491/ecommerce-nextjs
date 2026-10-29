import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("node:https", () => ({ request: mocks.request }));
import { downloadImage } from "./secure-input";
beforeEach(() => { vi.stubEnv("IMAGE_EMBED_ALLOWED_ORIGINS", "https://images.example"); mocks.lookup.mockReset().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]); mocks.request.mockReset(); });
afterEach(() => vi.unstubAllEnvs());
function respond(status: number, chunks: Buffer[], mime = "image/png") {
  mocks.request.mockImplementation((_url, options, callback) => {
    options.lookup("images.example", {}, (_error: unknown, address: string) => expect(address).toBe("93.184.216.34"));
    const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: () => void };
    req.destroy = () => { req.emit("close"); };
    req.end = () => {
      const stream = Object.assign(new PassThrough(), { statusCode: status, headers: { "content-type": mime } });
      callback(stream); for (const chunk of chunks) stream.write(chunk); stream.end(); req.emit("close");
    };
    return req;
  });
}
it("pins an approved public address rather than resolving at connection time", async () => { respond(200, [Buffer.from("synthetic-image")]); expect((await downloadImage("https://images.example/photo")).bytes.length).toBe(15); expect(mocks.lookup).toHaveBeenCalledTimes(1); });
it("rejects any private answer in a mixed DNS result before connecting", async () => { mocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }, { address: "169.254.169.254", family: 4 }]); await expect(downloadImage("https://images.example/photo")).rejects.toThrow("not public"); expect(mocks.request).not.toHaveBeenCalled(); });
it("never follows redirects", async () => { respond(302, []); await expect(downloadImage("https://images.example/photo")).rejects.toThrow("fetch rejected"); expect(mocks.request).toHaveBeenCalledTimes(1); });
it("rejects oversized chunked responses without trusting Content-Length", async () => { respond(200, [Buffer.alloc(5 * 1024 * 1024 + 1)]); await expect(downloadImage("https://images.example/photo")).rejects.toThrow("too large"); });
it("rejects non-image responses", async () => { respond(200, [], "text/html"); await expect(downloadImage("https://images.example/photo")).rejects.toThrow("Unsupported"); });

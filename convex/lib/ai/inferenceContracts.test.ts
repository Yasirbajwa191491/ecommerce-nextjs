import { afterEach, expect, it, vi } from "vitest";
import { createRemoteWorkerProvider } from "./providers/remoteWorker";
import { callImageEmbedApi } from "./imageEmbeddingClient";
import { IMAGE_EMBEDDING_VERSION, REVIEW_EMBEDDING_VERSION } from "./constants";
vi.mock("../siteUrl", () => ({ getSiteUrl: () => "https://shop.example.invalid" }));
afterEach(() => vi.unstubAllGlobals());
it("requires versioned, finite worker embeddings instead of mixing old vectors", async () => {
 const fetch = vi.fn(); vi.stubGlobal("fetch", fetch); const provider = createRemoteWorkerProvider({ baseUrl: "https://worker.example.invalid", secret: "synthetic-test-key" });
 for (const body of [{ embedding: Array(384).fill(1) }, { embedding: [1], version: REVIEW_EMBEDDING_VERSION }]) { fetch.mockResolvedValueOnce(Response.json(body)); await expect(provider.embed("fixture")).rejects.toThrow("contract"); }
 fetch.mockResolvedValueOnce(Response.json({ embedding: Array(384).fill(1), version: REVIEW_EMBEDDING_VERSION })); expect(await provider.embed("fixture")).toHaveLength(384);
 expect(provider.model).toBe(REVIEW_EMBEDDING_VERSION); expect(fetch.mock.calls[0][1]).toMatchObject({ redirect: "error", signal: expect.any(AbortSignal) });
});
it("rejects missing/old image API versions and accepts the matching contract", async () => {
 const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
 for (const version of [undefined, "v1", IMAGE_EMBEDDING_VERSION]) {
  fetch.mockResolvedValueOnce(Response.json({ embedding: Array(768).fill(1), provider: "siglip", model: "Xenova/siglip-base-patch16-224", dimensions: 768, version }));
  if (version === IMAGE_EMBEDDING_VERSION) expect((await callImageEmbedApi({ imageBase64: "fixture" })).embedding).toHaveLength(768);
  else await expect(callImageEmbedApi({ imageBase64: "fixture" })).rejects.toThrow("contract");
 }
});

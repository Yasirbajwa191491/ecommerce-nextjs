import { beforeEach, afterEach, expect, it, vi } from "vitest";
import sharp from "sharp";
import { createImageEmbeddingService } from "./service";
import { recordProviderSuccess } from "./health";
const mocks = vi.hoisted(() => ({ env: { allowRemoteModels: true, allowLocalModels: false, localModelPath: "" }, pipeline: vi.fn(), extract: vi.fn(), fromBlob: vi.fn() }));
function service() { return createImageEmbeddingService(async () => ({ env: mocks.env, pipeline: mocks.pipeline, RawImage: { read: async () => ({}), fromBlob: mocks.fromBlob } })); }
beforeEach(() => { recordProviderSuccess("siglip"); recordProviderSuccess("clip"); mocks.pipeline.mockReset().mockResolvedValue(mocks.extract); mocks.extract.mockReset(); mocks.fromBlob.mockReset().mockResolvedValue({ synthetic: true }); });
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
async function image() { return (await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer()).toString("base64"); }
it("keeps local q8 models, dimensions, normalization and version explicit", async () => {
  const values = new Float32Array(768); values[0] = 3; values[1] = 4; mocks.extract.mockResolvedValue({ data: values });
  const embedImage = service();
  const result = await embedImage({ imageBase64: await image(), mimeType: "image/png" });
  expect(result).toMatchObject({ provider: "siglip", dimensions: 768, version: "hf4.3.2-q8-image-v2" });
  expect(result.embedding[0]).toBeCloseTo(0.6); expect(Math.hypot(...result.embedding)).toBeCloseTo(1);
  expect(mocks.pipeline).toHaveBeenCalledWith("image-feature-extraction", "Xenova/siglip-base-patch16-224", { dtype: "q8", device: "cpu", local_files_only: true });
  expect(mocks.extract).toHaveBeenCalledWith({ synthetic: true }, { pool: true });
  expect(mocks.env).toMatchObject({ allowRemoteModels: false, allowLocalModels: true });

});
it("falls back to CLIP with its own dimension when SigLIP cannot load", async () => {
  mocks.pipeline.mockImplementation(async (_task, model) => { if (String(model).includes("siglip")) throw new Error("fixture missing model"); return mocks.extract; });
  mocks.extract.mockResolvedValue({ data: new Float32Array(512).fill(1) });
  const embedImage = service();
  expect(await embedImage({ imageBase64: await image(), mimeType: "image/png" })).toMatchObject({ provider: "clip", dimensions: 512 });
});
it("rejects corrupt, unsupported, oversized, and missing image input before inference", async () => {
  const embedImage = service();
  for (const input of [{}, { imageBase64: "abcd", mimeType: "image/png" }, { imageBase64: "abcd", mimeType: "image/svg+xml" }, { imageBase64: "a".repeat(7_000_001), mimeType: "image/png" }]) await expect(embedImage(input)).rejects.toThrow();
  expect(mocks.pipeline).not.toHaveBeenCalled();
});
it("rejects changed model IDs and invalid numerical or dimensional outputs", async () => {
  const embedImage = service(); const data = await image();
  mocks.extract.mockResolvedValue({ data: new Float32Array(12).fill(1) });
  await expect(embedImage({ imageBase64: data, mimeType: "image/png" })).rejects.toThrow();
  mocks.extract.mockResolvedValue({ data: new Float32Array(768).fill(NaN) });
  await expect(embedImage({ imageBase64: data, mimeType: "image/png" })).rejects.toThrow();
  vi.stubEnv("SIGLIP_MODEL", "unapproved/model"); vi.stubEnv("CLIP_MODEL", "unapproved/model");
  await expect(embedImage({ imageBase64: data, mimeType: "image/png" })).rejects.toThrow();
});

it("shares initialization across simultaneous embeddings", async () => {
  const data = await image(); mocks.extract.mockResolvedValue({ data: new Float32Array(768).fill(1) });
  const embedImage = service();
  await Promise.all([embedImage({ imageBase64: data, mimeType: "image/png" }), embedImage({ imageBase64: data, mimeType: "image/png" })]);
  expect(mocks.pipeline).toHaveBeenCalledTimes(1);
});

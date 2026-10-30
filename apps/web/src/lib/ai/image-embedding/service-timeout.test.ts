import { setTimeout as delay } from "node:timers/promises";
import { expect, it, vi } from "vitest";
import sharp from "sharp";
const mocks = vi.hoisted(() => ({ extract: vi.fn() }));
import { createImageEmbeddingService } from "./service";
it("times out responses while retaining native-work slots until actual completion", async () => {
 const embedImage = createImageEmbeddingService(async () => ({ env: { allowRemoteModels: false, allowLocalModels: true, localModelPath: "" }, pipeline: async () => mocks.extract, RawImage: { read: async () => ({}), fromBlob: async () => ({ fixture: true }) } }));
 const imageBase64 = (await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer()).toString("base64");
 let release!: (value: { data: Float32Array }) => void;
 mocks.extract.mockReturnValue(new Promise(resolve => { release = resolve; }));
 vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
 try {
  const first = embedImage({ imageBase64, mimeType: "image/png" }), second = embedImage({ imageBase64, mimeType: "image/png" });
  const checks = [expect(first).rejects.toThrow("timeout"), expect(second).rejects.toThrow("timeout")];
  // Let native Sharp I/O finish before advancing the simulated response deadline.
  for (let n = 0; n < 200 && mocks.extract.mock.calls.length < 2; n++) await delay(5);
  expect(mocks.extract).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(30_000); await Promise.all(checks);
  await expect(embedImage({ imageBase64, mimeType: "image/png" })).rejects.toThrow("busy");
 } finally {
  release({ data: new Float32Array(768).fill(1) }); await delay(5); vi.useRealTimers();
 }
});

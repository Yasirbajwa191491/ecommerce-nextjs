import { test } from "node:test";
import assert from "node:assert/strict";
import { createInferenceRuntime, normalizedEmbedding, REVIEW_EMBEDDING_VERSION } from "./transformers.js";

test("initialization is lazy, local-only, quantized, and single-flight", async () => {
  const calls = []; const env = {}; const extractor = async () => ({ data: new Float32Array(384) });
  const runtime = createInferenceRuntime(async () => ({ env, pipeline: async (...args) => { calls.push(args); return extractor; } }));
  assert.equal(calls.length, 0);
  const [a, b] = await Promise.all([runtime.getEmbeddingPipeline(), runtime.getEmbeddingPipeline()]);
  assert.equal(a, b); assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ["feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8", device: "cpu", local_files_only: true }]);
  assert.equal(env.allowRemoteModels, false); assert.equal(env.allowLocalModels, true);
  await runtime.getSentimentPipeline(); await runtime.getZeroShotPipeline(); assert.equal(calls.length, 3);
  assert.equal(REVIEW_EMBEDDING_VERSION, "hf4.3.2-q8-minilm-v2");
});
test("failed initialization can retry without a permanently rejected cache", async () => {
  let count = 0;
  const runtime = createInferenceRuntime(async () => { if (++count === 1) throw new Error("fixture model unavailable"); return { env: {}, pipeline: async () => "fixture" }; });
  await assert.rejects(runtime.getEmbeddingPipeline()); assert.equal(await runtime.getEmbeddingPipeline(), "fixture");
});
test("normalization preserves dimension and rejects malformed inference output", () => {
  const input = Array(384).fill(0); input[0] = 3; input[1] = 4;
  const output = normalizedEmbedding(input); assert.equal(output.length, 384); assert.ok(Math.abs(Math.hypot(...output) - 1) < 1e-9); assert.equal(output[0], 0.6);
  for (const bad of [[], Array(384).fill(0), Array(384).fill(NaN), Array(384).fill(Infinity)]) assert.throws(() => normalizedEmbedding(bad));
});
